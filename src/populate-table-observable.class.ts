import { Populate, Populated, PopulateOptions, RelationalDbSchema } from '@pvermeer/dexie-populate-addon';
import { ObservableTable, ObservableWhereClause } from '@pvermeer/dexie-rxjs-addon';
import Dexie, { Table } from 'dexie';
import { isEqual } from 'lodash';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, share, startWith, switchMap } from 'rxjs/operators';
import { PopulateObservableWhereClause } from './populate-observable-where-clause.class';
import { Unpacked } from './utility-types';

/**
 * Extended ObservableTable class that overwrites the methods to return a populated observable.
 */
export class PopulateTableObservable<T, TKey, B extends boolean, K extends string> extends ObservableTable<T, TKey> {

    constructor(
        _db: Dexie,
        _table: Table<any, TKey>,
        private _keysOrOptions: K[] | PopulateOptions<B> | undefined,
        private _relationalSchema: RelationalDbSchema
    ) {
        super(_db, _table as any);

        const populateResult = async (result: T) => {
            const populate = new Populate(result, this._keysOrOptions, this._db, this._table, this._relationalSchema);
            const getPopulated = await populate.populated;
            const populated = Array.isArray(result) ? getPopulated : (getPopulated.length ? getPopulated[0] : undefined);
            const populatedTree = await populate.populatedTree;
            return { populated, populatedTree };
        };

        const populateObservable = (observable: Observable<T>) => {
            let popResult: Unpacked<ReturnType<typeof populateResult>>;
            return observable.pipe(
                flatMap(async (result) => {
                    popResult = await populateResult(result);
                    return result;
                }),
                switchMap(result => this._db.changes$.pipe(
                    filter(changes => changes.some(change => {
                        if (!popResult.populatedTree[change.table]) { return false; }
                        const obj = 'obj' in change ? change.obj : change.oldObj;
                        return Object.keys(obj).some(objKey =>
                            popResult.populatedTree[change.table][objKey] &&
                            popResult.populatedTree[change.table][objKey][obj[objKey]]);
                    })),
                    startWith(null),
                    flatMap(async (_, i) => {
                        if (i > 0) { popResult = await populateResult(result); }
                        return popResult.populated;
                    }),
                    distinctUntilChanged<Populated<T, B, string> | Populated<T, B, string>[] | undefined>(isEqual),
                    share()
                ))
            );
        };

        // Override methods to return a populated observable
        Object.getOwnPropertyNames(ObservableTable.prototype).forEach(name => {
            if (typeof super[name] !== 'function' || name === 'constructor' || name.startsWith('_')) { return; }

            // Hijack method
            this[name] = (...args: any[]) => {

                const returnValue = super[name](...args);

                if (returnValue instanceof Observable) { return populateObservable(returnValue); }

                if (returnValue instanceof ObservableWhereClause) {

                    const observableWhereClause = returnValue;

                    return new PopulateObservableWhereClause(this._db, this._table, _keysOrOptions, observableWhereClause);

                }

                return returnValue;
            };

        });

    }

}

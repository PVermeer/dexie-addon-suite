import { Populate, Populated, PopulateOptions, RelationalDbSchema } from '@pvermeer/dexie-populate-addon';
import { ObservableTable } from '@pvermeer/dexie-rxjs-addon';
import { Dexie, Table } from 'dexie';
import { isEqual } from 'lodash';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, share, startWith, switchMap } from 'rxjs/operators';
import { PickMethods, Unpacked } from './utility-types';

/**
 * Overwrite Observable returns to Populated Observable returns.
 */
export type PopulateTableObservableT<
    T, TKey, B extends boolean, K extends string, U = PickMethods<PopulateTableObservable<T, TKey, B, K>>
    > = {
        [P in keyof U]: U[P] extends (...args: infer A) => infer R ? R extends Observable<infer O> ?
        (...args: A) => Observable<O extends any[] ? Populated<O[number], B, K>[] : Populated<O, B, K>> :
        never : never
    };

/**
 * Extended ObservableTable class that overwrites the methods to return a populated observable.
 */
export class PopulateTableObservable<T, TKey, B extends boolean, K extends string> extends ObservableTable<T, TKey> {

    constructor(
        _db: Dexie,
        _table: Table<T, TKey>,
        private _keysOrOptions: K[] | PopulateOptions<B> | undefined,
        private _relationalSchema: RelationalDbSchema
    ) {
        super(_db, _table);

        const populateResult = async (result: any) => {
            const populate = new Populate(result, this._keysOrOptions, this._db, this._table, this._relationalSchema);
            const getPopulated = await populate.populated;
            const populated = Array.isArray(result) ? getPopulated : (getPopulated.length ? getPopulated[0] : undefined);
            const populatedTree = await populate.populatedTree;
            return { populated, populatedTree };
        };

        // Override methods to return a populated observable
        Object.getOwnPropertyNames(ObservableTable.prototype).forEach(key => {
            if (typeof super[key] === 'function' && key !== 'constructor') {

                // Hijack method
                this[key] = (...args: any[]) => {

                    const returnValue = super[key](...args);
                    if (!(returnValue instanceof Observable)) { return returnValue; }

                    let popResult: Unpacked<ReturnType<typeof populateResult>>;

                    return returnValue.pipe(
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
                            distinctUntilChanged(isEqual),
                            share()
                        ))
                    );

                };

            }
        });
    }

}

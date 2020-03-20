import { PopulateOptions } from '@pvermeer/dexie-populate-addon';
import { ObservableCollection, ObservableWhereClause } from '@pvermeer/dexie-rxjs-addon';
import Dexie, { Table } from 'dexie';
import { DexieExtended } from './typings';
import { PopulateObservableCollection } from './populate-observable-collection.class';

export class PopulateObservableWhereClause<T, TKey, B extends boolean, K extends string> extends ObservableWhereClause<T, TKey> {

    get Collection() {
        const db = this._db as DexieExtended;
        const table = this._table;
        const keysOrOptions = this._keysOrOptions;

        // Hijack Collection class getter.
        return class Callable {
            constructor(...args: ConstructorParameters<typeof db.Collection>) {

                const collection = new db.Collection<T, TKey>(...args);
                return new PopulateObservableCollection(db, table, collection, keysOrOptions);
            }
        } as unknown as typeof ObservableCollection;
    }

    constructor(
        _db: Dexie,
        _table: Table<T, TKey>,
        protected _keysOrOptions: K[] | PopulateOptions<B> | undefined,
        _observableWhereClause: ObservableWhereClause<T, TKey>
    ) {
        super(_db, _table, (_observableWhereClause as any)._whereClause);
    }

}

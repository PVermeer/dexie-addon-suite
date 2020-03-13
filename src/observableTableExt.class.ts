import { PopulateOptions, PopulateTable, RelationalDbSchema } from '@pvermeer/dexie-populate-addon';
import { ObservableTable } from '@pvermeer/dexie-rxjs-addon';
import { Dexie, Table, TableSchema, Transaction } from 'dexie';
import { PopulateTableObservable } from './populateTableObservable.class';
import { DexieExtended } from './typings';

export interface PopObsTableI<T, TKey> extends Table<T, TKey> {
    $: ObservableTablePopulated<T, TKey>;

    populate<B extends boolean = false, K extends string = string>(
        keys: K[],
        options?: PopulateOptions<B>
    ): PopulatedTableObservable<T, TKey, B, K>;
    populate<B extends boolean = false>(options?: PopulateOptions<B>): PopulatedTableObservable<T, TKey, B, string>;
    populate<B extends boolean = false, K extends string = string>(
        keysOrOptions?: K[] | PopulateOptions<B>
    ): PopulatedTableObservable<T, TKey, B, K>;
}


export class PopulatedTableObservable<T, TKey, B extends boolean, K extends string> extends PopulateTable<T, TKey, B, K> {

    public $: PopulateTableObservable<T, TKey, B, K> = new PopulateTableObservable<T, TKey, B, K>(
        this._db,
        this._table,
        this._keysOrOptions,
        this._relationalSchema
    );

    constructor(
        _keysOrOptions: K[] | PopulateOptions<B> | undefined,
        _db: Dexie,
        _table: Table<T, TKey>,
        _relationalSchema: RelationalDbSchema
    ) {
        super(_keysOrOptions, _db, _table, _relationalSchema);
    }
}

export class ObservableTablePopulated<T, TKey> extends ObservableTable<T, TKey> {

    public populate<B extends boolean = false, K extends string = string>(keysOrOptions?: K[] | PopulateOptions<B>) {
        return new PopulateTableObservable<T, TKey, B, K>(
            this._db,
            this._table,
            keysOrOptions,
            (this._db as DexieExtended)._relationalSchema
        );
    }

    constructor(
        _db: Dexie,
        _table: Table<T, TKey>,
    ) {
        super(_db, _table);
    }
}


export function getPopulatedObservableTable<T, TKey>(db: Dexie) {

    const TableClass = db.Table as DexieExtended['Table'];

    return class PopObsTable extends TableClass<T, TKey> implements PopObsTableI<T, TKey> {

        public $: ObservableTablePopulated<T, TKey> = new ObservableTablePopulated<T, TKey>(db, this);

        public populate<B extends boolean = false, K extends string = string>(
            keysOrOptions?: K[] | PopulateOptions<B>
        ): PopulatedTableObservable<T, TKey, B, K> {
            return new PopulatedTableObservable<T, TKey, B, K>(
                keysOrOptions,
                db,
                this,
                (this.db as DexieExtended)._relationalSchema
            );
        }


        constructor(
            _name: string,
            _tableSchema: TableSchema,
            _optionalTrans: Transaction | undefined
        ) {
            super(_name, _tableSchema, _optionalTrans);
        }

    };

}

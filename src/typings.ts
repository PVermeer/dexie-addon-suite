import { RelationalDbSchema } from '@pvermeer/dexie-populate-addon';
import { Collection, Dexie, KeyRange, Table, TableSchema, Transaction, WhereClause } from 'dexie';

export interface DexieExtended extends Dexie {
    Table: new <T, TKey>(name: string, tableSchema: TableSchema, optionalTrans?: Transaction) => Table<T, TKey>;
    Collection: new <T, TKey>(whereClause?: WhereClause | null, keyRangeGenerator?: () => KeyRange) => Collection<T, TKey>;
    _relationalSchema: RelationalDbSchema;
}

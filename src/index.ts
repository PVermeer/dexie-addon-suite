/* istanbul ignore file */

import { PopulateOptions } from '@pvermeer/dexie-populate-addon';
import { ObservableTablePopulated, PopulatedTableObservable } from './table-extended.class';

export { encrypted, Encryption } from '@pvermeer/dexie-encrypted-addon';
export { immutable } from '@pvermeer/dexie-immutable-addon';
export { populate, Ref } from '@pvermeer/dexie-populate-addon';
export { dexieRxjs } from '@pvermeer/dexie-rxjs-addon';
export { addonSuite } from './addon-suite';
export { ObservableTablePopulated, PopulatedTableObservable } from './table-extended.class';


declare module 'dexie' {

    /**
     * Extended Table class with suite methods.
     */
    interface Table<T, TKey> {
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

}

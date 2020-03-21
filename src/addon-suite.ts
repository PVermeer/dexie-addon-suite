import { encrypted, EncryptedOptions } from '@pvermeer/dexie-encrypted-addon';
import { immutable } from '@pvermeer/dexie-immutable-addon';
import { populate } from '@pvermeer/dexie-populate-addon';
import { dexieRxjs } from '@pvermeer/dexie-rxjs-addon';
import Dexie from 'dexie';
import { getPopulatedObservableTable } from './table-extended.class';

export interface Config {
    encrypted?: EncryptedOptions;
    immutable?: boolean;
}

export function addonSuite(db: Dexie, config?: Config | EncryptedOptions) {

    // Process config

    /** Default config */
    const addons: { [prop: string]: boolean } = {
        immutable: true,
        encrypted: false,
        rxjs: true,
        populate: true
    };
    let secretKey: string | undefined;
    if (config) {
        if ('secretKey' in config) {
            Object.keys(addons).forEach(key => addons[key] = true);
            secretKey = config.secretKey;
            addons.immutable = config.immutable || true;
        } else {
            Object.entries(config as Config).forEach(([key, value]) => {
                if (typeof value === 'boolean' && key in addons) { addons[key] = true; }
                if (key === 'encrypted') {
                    secretKey = value.secretKey;
                    addons.immutable = value.immutable || true;
                }
            });
        }
    }

    // Load addons
    Object.entries(addons).forEach(([key, value]) => {
        if (!value) { return; }
        loadAddon(key, db, addons, secretKey);
    });

    // Overwrite Table to a populated observable table
    Object.defineProperty(db, 'Table', {
        value: getPopulatedObservableTable(db)
    });

}

export const loadAddon = (
    key: string,
    db: Dexie,
    addons: { [prop: string]: boolean },
    secretKey: string | undefined
) => {
    switch (key) {
        case 'immutable': immutable(db); break;
        case 'encrypted': encrypted(db, { immutable: addons.immutable, secretKey }); break;
        case 'rxjs': dexieRxjs(db); break;
        case 'populate': populate(db); break;
    }
};

addonSuite.setOptions = (config: Config | EncryptedOptions) => (db: Dexie) => encrypted(db, config);

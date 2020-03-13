import { encrypted, EncryptedOptions } from '@pvermeer/dexie-encrypted-addon';
import { immutable } from '@pvermeer/dexie-immutable-addon';
import { populate } from '@pvermeer/dexie-populate-addon';
import { dexieRxjs } from '@pvermeer/dexie-rxjs-addon';
import Dexie from 'dexie';
import { getPopulatedObservableTable } from './observableTableExt.class';

interface Config {
    immutable?: boolean;
    encrypted?: {
        options?: EncryptedOptions
    };
    rxjs?: boolean;
    populate?: boolean;
}

export function addonSuite(db: Dexie, config: Config | EncryptedOptions) {

    // Process config
    const addons: Record<keyof Config, boolean> = {
        immutable: false,
        encrypted: false,
        rxjs: false,
        populate: false
    };
    let secretKey: string | undefined;
    if ('secretKey' in config) {
        Object.keys(addons).forEach(key => addons[key] = true);
        secretKey = config.secretKey;
        addons.immutable = config.immutable || true;
    } else {
        Object.entries(config as Config).forEach(([key, value]) => {
            if (value && addons[key]) { addons[key] = true; }
            if (key === 'encrypted') {
                secretKey = value.options.secretKey;
                addons.immutable = value.immutable || true;
            }
        });
    }

    // Load addons
    Object.entries(addons).forEach(([key, value]) => {
        if (!value) { return; }
        switch (key) {
            case 'immutable': immutable(db); break;
            case 'encrypted': encrypted(db, { immutable: addons.immutable, secretKey }); break;
            case 'rxjs': dexieRxjs(db); break;
            case 'populate': populate(db); break;
        }
    });

    // Perform actions for combinations
    if (addons.rxjs && addons.populate) {

        Object.defineProperty(db, 'Table', {
            value: getPopulatedObservableTable(db)
        });

    }

}


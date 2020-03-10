import { encrypted } from '@pvermeer/dexie-encrypted-addon';
import { EncryptedOptions } from '@pvermeer/dexie-encrypted-addon/dist/encrypted';
import { immutable } from '@pvermeer/dexie-immutable-addon';
import { populate } from '@pvermeer/dexie-populate-addon';
import { dexieRxjs } from '@pvermeer/dexie-rxjs-addon';
import Dexie from 'dexie';
import { UnionizeProperties } from 'simplytyped';

interface Config {
    immutable?: boolean;
    encrypted?: {
        options?: EncryptedOptions
    };
    rxjs?: boolean;
    populate?: boolean;
}

export function addonSuite(db: Dexie, config: Config | EncryptedOptions) {

    if ('secretKey' in config) {
        immutable(db);
        encrypted(db, config);
        dexieRxjs(db);
        populate(db);
    } else {
        Object.values(config).forEach(([key, value]: [keyof Config, UnionizeProperties<Config>]) => {
            if (!value) { return; }
            const options = typeof value !== 'boolean' ? value.options : undefined;
            switch (key) {
                case 'immutable': immutable(db); break;
                case 'encrypted': encrypted(db, options); break;
                case 'rxjs': dexieRxjs(db); break;
                case 'populate': populate(db); break;
            }
        });
    }

}


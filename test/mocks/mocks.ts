import { Ref } from '@pvermeer/dexie-populate-addon';
import Dexie from 'dexie';
import faker from 'faker/locale/en';
import { addonSuite } from '../../src/addon-suite';
import { Encryption } from '../../src/index';
import { OmitMethods } from '../../src/utility-types';

export class HairColor {
    id?: number;
    name: string;

    doSomething() {
        return 'done';
    }

    constructor(input: OmitMethods<HairColor>) {
        Object.entries(input).forEach(([key, value]) => {
            this[key] = value;
        });
    }

}
export class Style {
    id?: number;
    name: string;
    color: string;
    description: string;

    doSomething() {
        return 'done';
    }

    constructor(style: OmitMethods<Style>) {
        Object.entries(style).forEach(([key, value]) => {
            this[key] = value;
        });
    }

}
export class Theme {
    id?: number;
    name: string;
    style: Ref<Style, number>;
    description: string;

    doSomething() {
        return 'done';
    }

    constructor(theme: OmitMethods<Theme>) {
        Object.entries(theme).forEach(([key, value]) => {
            this[key] = value;
        });
    }

}
export class Club {
    id?: number;
    name: string;
    size: number;
    theme: Ref<Theme, number>;
    description: string;

    doSomething() {
        return 'done';
    }

    constructor(club: OmitMethods<Club>) {
        Object.entries(club).forEach(([key, value]) => {
            this[key] = value;
        });
    }

}
export class Group {
    id?: number;
    name: string;
    true: boolean;
    description: string;

    doSomething() {
        return 'done';
    }

    constructor(group: OmitMethods<Group>) {
        Object.entries(group).forEach(([key, value]) => {
            this[key] = value;
        });
    }

}
export class Friend {
    id?: string;
    testProp?: string;
    age: number;
    hasAge?: boolean;
    firstName: string;
    lastName: string;
    shoeSize: number;
    customId: number;
    some?: { id: number; other: string };
    hasFriends: Ref<Friend[], number[]>;
    memberOf: Ref<Club[], number[]>;
    group: Ref<Group, number>;
    hairColor: Ref<HairColor, number>;

    doSomething() {
        return 'done';
    }

    constructor(friend: OmitMethods<Friend>) {
        Object.entries(friend).forEach(([key, value]) => {
            this[key] = value;
        });
    }
}

export const databasesPositive = [
    {
        desc: 'TestDatabase',
        immutable: true,
        encrypted: true,
        rxjs: true,
        populate: true,
        db: (dexie: typeof Dexie) => new class TestDatabase extends dexie {
            public friends: Dexie.Table<Friend, string>;
            public clubs: Dexie.Table<Club, number>;
            public themes: Dexie.Table<Theme, number>;
            public groups: Dexie.Table<Group, number>;
            public styles: Dexie.Table<Style, number>;
            public hairColors: Dexie.Table<HairColor, number>;
            constructor(name: string) {
                super(name);
                const secretKey = Encryption.createRandomEncryptionKey();
                addonSuite(this, { secretKey });
                this.on('blocked', () => false);
                this.version(1).stores({
                    friends: '#id, customId, $firstName, lastName, shoeSize, age, [age+shoeSize], hasFriends => friends.id, memberOf => clubs.id, group => groups.id, hairColor => hairColors.id',
                    clubs: '++id, name, theme => themes.id',
                    themes: '++id, name, style => styles.id',
                    styles: '++id, name, color',
                    groups: '++id, name',
                    hairColors: '++id, name'
                });
                this.friends.mapToClass(Friend);
                this.clubs.mapToClass(Club);
                this.themes.mapToClass(Theme);
                this.groups.mapToClass(Group);
                this.styles.mapToClass(Style);
                this.hairColors.mapToClass(HairColor);
            }
        }('TestDatabase')
    },
    {
        desc: 'TestDatabase - all addons',
        immutable: true,
        encrypted: true,
        rxjs: true,
        populate: true,
        db: (dexie: typeof Dexie) => new class TestDatabase extends dexie {
            public friends: Dexie.Table<Friend, string>;
            public clubs: Dexie.Table<Club, number>;
            public themes: Dexie.Table<Theme, number>;
            public groups: Dexie.Table<Group, number>;
            public styles: Dexie.Table<Style, number>;
            public hairColors: Dexie.Table<HairColor, number>;
            constructor(name: string) {
                super(name);
                const secretKey = Encryption.createRandomEncryptionKey();
                addonSuite(this, { encrypted: { secretKey }, immutable: true, populate: true, rxjs: true });
                this.on('blocked', () => false);
                this.version(1).stores({
                    friends: '#id, customId, $firstName, lastName, shoeSize, age, [age+shoeSize], hasFriends => friends.id, memberOf => clubs.id, group => groups.id, hairColor => hairColors.id',
                    clubs: '++id, name, theme => themes.id',
                    themes: '++id, name, style => styles.id',
                    styles: '++id, name, color',
                    groups: '++id, name',
                    hairColors: '++id, name'
                });
                this.friends.mapToClass(Friend);
                this.clubs.mapToClass(Club);
                this.themes.mapToClass(Theme);
                this.groups.mapToClass(Group);
                this.styles.mapToClass(Style);
                this.hairColors.mapToClass(HairColor);
            }
        }('TestDatabase - all addons')
    },
    {
        desc: 'TestDatabase - populate / observable',
        rxjs: true,
        populate: true,
        db: (dexie: typeof Dexie) => new class TestDatabase extends dexie {
            public friends: Dexie.Table<Friend, string>;
            public clubs: Dexie.Table<Club, number>;
            public themes: Dexie.Table<Theme, number>;
            public groups: Dexie.Table<Group, number>;
            public styles: Dexie.Table<Style, number>;
            public hairColors: Dexie.Table<HairColor, number>;
            constructor(name: string) {
                super(name);
                addonSuite(this, { populate: true, rxjs: true });
                this.on('blocked', () => false);
                this.version(1).stores({
                    friends: '++id, customId, firstName, lastName, shoeSize, age, [age+shoeSize], hasFriends => friends.id, memberOf => clubs.id, group => groups.id, hairColor => hairColors.id',
                    clubs: '++id, name, theme => themes.id',
                    themes: '++id, name, style => styles.id',
                    styles: '++id, name, color',
                    groups: '++id, name',
                    hairColors: '++id, name'
                });
                this.friends.mapToClass(Friend);
                this.clubs.mapToClass(Club);
                this.themes.mapToClass(Theme);
                this.groups.mapToClass(Group);
                this.styles.mapToClass(Style);
                this.hairColors.mapToClass(HairColor);
            }
        }('TestDatabase - populate / observable')
    },
    {
        desc: 'TestDatabase - immutable',
        immutable: true,
        db: (dexie: typeof Dexie) => new class TestDatabase extends dexie {
            public friends: Dexie.Table<Friend, string>;
            public clubs: Dexie.Table<Club, number>;
            public themes: Dexie.Table<Theme, number>;
            public groups: Dexie.Table<Group, number>;
            public styles: Dexie.Table<Style, number>;
            public hairColors: Dexie.Table<HairColor, number>;
            constructor(name: string) {
                super(name);
                addonSuite(this, { immutable: true });
                this.on('blocked', () => false);
                this.version(1).stores({
                    friends: '++id, customId, firstName, lastName, shoeSize, age, [age+shoeSize]',
                    clubs: '++id, name',
                    themes: '++id, name',
                    styles: '++id, name, color',
                    groups: '++id, name',
                    hairColors: '++id, name'
                });
                this.friends.mapToClass(Friend);
                this.clubs.mapToClass(Club);
                this.themes.mapToClass(Theme);
                this.groups.mapToClass(Group);
                this.styles.mapToClass(Style);
                this.hairColors.mapToClass(HairColor);
            }
        }('TestDatabase - immutable')
    },
    {
        desc: 'TestDatabase - encrypted',
        encrypted: true,
        db: (dexie: typeof Dexie) => new class TestDatabase extends dexie {
            public friends: Dexie.Table<Friend, string>;
            public clubs: Dexie.Table<Club, number>;
            public themes: Dexie.Table<Theme, number>;
            public groups: Dexie.Table<Group, number>;
            public styles: Dexie.Table<Style, number>;
            public hairColors: Dexie.Table<HairColor, number>;
            constructor(name: string) {
                super(name);
                const secretKey = Encryption.createRandomEncryptionKey();
                addonSuite(this, { encrypted: { secretKey } });
                this.on('blocked', () => false);
                this.version(1).stores({
                    friends: '#id, customId, $firstName, lastName, shoeSize, age, [age+shoeSize]',
                    clubs: '++id, name',
                    themes: '++id, name',
                    styles: '++id, name, color',
                    groups: '++id, name',
                    hairColors: '++id, name'
                });
                this.friends.mapToClass(Friend);
                this.clubs.mapToClass(Club);
                this.themes.mapToClass(Theme);
                this.groups.mapToClass(Group);
                this.styles.mapToClass(Style);
                this.hairColors.mapToClass(HairColor);
            }
        }('TestDatabase - encrypted')
    },
    {
        desc: 'TestDatabase - rxjs',
        rxjs: true,
        db: (dexie: typeof Dexie) => new class TestDatabase extends dexie {
            public friends: Dexie.Table<Friend, string>;
            public clubs: Dexie.Table<Club, number>;
            public themes: Dexie.Table<Theme, number>;
            public groups: Dexie.Table<Group, number>;
            public styles: Dexie.Table<Style, number>;
            public hairColors: Dexie.Table<HairColor, number>;
            constructor(name: string) {
                super(name);
                addonSuite(this, { rxjs: true });
                this.on('blocked', () => false);
                this.version(1).stores({
                    friends: '++id, customId, firstName, lastName, shoeSize, age, [age+shoeSize]',
                    clubs: '++id, name',
                    themes: '++id, name',
                    styles: '++id, name, color',
                    groups: '++id, name',
                    hairColors: '++id, name'
                });
                this.friends.mapToClass(Friend);
                this.clubs.mapToClass(Club);
                this.themes.mapToClass(Theme);
                this.groups.mapToClass(Group);
                this.styles.mapToClass(Style);
                this.hairColors.mapToClass(HairColor);
            }
        }('TestDatabase - rxjs')
    },
    {
        desc: 'TestDatabase - populate',
        populate: true,
        db: (dexie: typeof Dexie) => new class TestDatabase extends dexie {
            public friends: Dexie.Table<Friend, string>;
            public clubs: Dexie.Table<Club, number>;
            public themes: Dexie.Table<Theme, number>;
            public groups: Dexie.Table<Group, number>;
            public styles: Dexie.Table<Style, number>;
            public hairColors: Dexie.Table<HairColor, number>;
            constructor(name: string) {
                super(name);
                addonSuite(this, { populate: true });
                this.on('blocked', () => false);
                this.version(1).stores({
                    friends: '++id, customId, firstName, lastName, shoeSize, age, [age+shoeSize], hasFriends => friends.id, memberOf => clubs.id, group => groups.id, hairColor => hairColors.id',
                    clubs: '++id, name, theme => themes.id',
                    themes: '++id, name, style => styles.id',
                    styles: '++id, name, color',
                    groups: '++id, name',
                    hairColors: '++id, name'
                });
                this.friends.mapToClass(Friend);
                this.clubs.mapToClass(Club);
                this.themes.mapToClass(Theme);
                this.groups.mapToClass(Group);
                this.styles.mapToClass(Style);
                this.hairColors.mapToClass(HairColor);
            }
        }('TestDatabase - populate')
    }
];

let customId = 1000000;
export const mockFriends = (count: number = 5): Friend[] => {
    const friend = () => new Friend({
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: faker.random.number({ min: 1, max: 80 }),
        shoeSize: faker.random.number({ min: 5, max: 12 }),
        customId,
        hasFriends: [],
        memberOf: [],
        group: null,
        hairColor: null
    });
    return new Array(count).fill(null).map(() => {
        const mockfriend = friend();
        mockfriend.customId = customId;
        customId++;
        return mockfriend;
    });
};
export const mockClubs = (count: number = 5): Club[] => {
    const club = () => new Club({
        name: faker.lorem.words(2),
        size: faker.random.number(),
        theme: null,
        description: faker.lorem.sentences(4)
    });
    return new Array(count).fill(null).map(() => club());
};
export const mockThemes = (count: number = 5): Theme[] => {
    const theme = () => new Theme({
        name: faker.lorem.words(2),
        style: null,
        description: faker.lorem.sentences(4)
    });
    return new Array(count).fill(null).map(() => theme());
};
export const mockGroups = (count: number = 5): Group[] => {
    const group = () => new Group({
        name: faker.lorem.words(2),
        true: faker.random.boolean(),
        description: faker.lorem.sentences(4)
    });
    return new Array(count).fill(null).map(() => group());
};
export const mockStyles = (count: number = 5): Style[] => {
    const style = () => new Style({
        name: faker.lorem.words(2),
        color: faker.random.word(),
        description: faker.lorem.sentences(4)
    });
    return new Array(count).fill(null).map(() => style());
};
export const mockHairColors = (count: number = 5): HairColor[] => {
    const hairColor = () => new HairColor({
        name: faker.lorem.words(2),
    });
    return new Array(count).fill(null).map(() => hairColor());
};

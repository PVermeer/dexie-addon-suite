// tslint:disable: no-non-null-assertion
import { Populated } from '@pvermeer/dexie-populate-addon';
import Dexie from 'dexie';
import faker from 'faker/locale/nl';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import * as addonSuiteModule from '../../../src/addon-suite';
import { addonSuite, Encryption } from '../../../src/index';
import { PopulateTableObservable } from '../../../src/populate-table-observable.class';
import { flatPromise } from '../../../src/utility';
import { Club, databasesPositive, Friend, Group, HairColor, mockClubs, mockFriends, mockGroups, mockHairColors, mockStyles, mockThemes, Style, Theme } from '../../mocks/mocks';

describe('Suite', () => {
    databasesPositive.forEach((database, _i) => {
        // if (_i !== 0) { return; }
        describe(database.desc, () => {
            let db: ReturnType<typeof database.db>;

            let subs: Subscription;
            let friends: Friend[];
            let friend: Friend;
            let ids: string[];
            let id: string;
            let friendExpected: Friend;
            let friendExpectedPop: Populated<Friend, false, string>;
            let clubs: Club[];
            let groups: Group[];
            let hairColors: HairColor[];
            let themes: Theme[];
            let styles: Style[];

            let clubIds: number[];
            let groupIds: number[];
            let hairColorIds: number[];
            let themeIds: number[];
            let styleIds: number[];

            beforeEach(async () => {
                db = database.db(Dexie);
                await db.open();
                expect(db.isOpen()).toBeTrue();

                friends = mockFriends();
                clubs = mockClubs();
                groups = mockGroups();
                hairColors = mockHairColors();
                themes = mockThemes();
                styles = mockStyles();

                friend = friends[0];
                [ids, clubIds, groupIds, hairColorIds, themeIds, styleIds] = await Promise.all([
                    db.friends.bulkAdd(friends, { allKeys: true }),
                    db.clubs.bulkAdd(clubs, { allKeys: true }),
                    db.groups.bulkAdd(groups, { allKeys: true }),
                    db.hairColors.bulkAdd(hairColors, { allKeys: true }),
                    db.themes.bulkAdd(themes, { allKeys: true }),
                    db.styles.bulkAdd(styles, { allKeys: true })
                ]);
                id = ids[0];

                await Promise.all([
                    db.friends.update(id, {
                        hasFriends: ids.slice(1),
                        memberOf: clubIds,
                        group: groupIds[1],
                        hairColor: hairColorIds[1]
                    }),
                    db.friends.update(ids[1], {
                        hasFriends: ids.slice(3),
                        memberOf: clubIds.slice(3),
                        group: groupIds[2],
                        hairColor: hairColorIds[2]
                    }),
                    db.clubs.update(clubIds[1], {
                        theme: themeIds[1]
                    }),
                    db.themes.update(themeIds[1], {
                        style: styleIds[1]
                    })
                ]);

                friendExpected = new Friend(friend);
                friendExpected.id = id;
                friendExpected.hasFriends = ids.slice(1) as any;
                friendExpected.memberOf = clubIds as any;
                friendExpected.group = groupIds[1] as any;
                friendExpected.hairColor = hairColorIds[1] as any;

                friendExpectedPop = new Friend(friend) as Populated<Friend, false, string>;
                friendExpectedPop.id = id;
                friendExpectedPop.hasFriends = friends.slice(1).map((x, i) => { x.id = ids[i + 1]; return x; }) as any;
                friendExpectedPop.memberOf = clubs.map((x, i) => { x.id = clubIds[i]; return x; }) as any;
                friendExpectedPop.group = groups.map((x, i) => { x.id = groupIds[i]; return x; })[1] as any;
                friendExpectedPop.hairColor = hairColors.map((x, i) => { x.id = hairColorIds[i]; return x; })[1] as any;

                friendExpectedPop.memberOf[1]!.theme = themes.map((x, i) => { x.id = themeIds[i]; return x; })[1] as any;
                friendExpectedPop.memberOf[1]!.theme!.style = styles.map((x, i) => { x.id = styleIds[i]; return x; })[1] as any;

                friendExpectedPop.hasFriends[0]!.hasFriends = friends.slice(3) as any;
                friendExpectedPop.hasFriends[0]!.memberOf = clubs.slice(3) as any;
                friendExpectedPop.hasFriends[0]!.group = groups[2] as any;
                friendExpectedPop.hasFriends[0]!.hairColor = hairColors[2] as any;

                subs = new Subscription();
            });
            afterEach(async () => {
                subs.unsubscribe();
                await db.delete();
                expect(db.isOpen()).toBeFalse();
            });

            if (database.immutable) {
                describe('Immutable', () => {
                    it('should override create / mutate methods', async () => {
                        const overrideMethods = [
                            'add',
                            'bulkAdd',
                            'put',
                            'bulkPut',
                            'update'
                        ];
                        overrideMethods.forEach(method => {
                            expect(db.Table.prototype[method].toString())
                                .toEqual(jasmine.stringMatching('clonedeep'));
                        });
                    });
                    it('should not change input object', async () => {
                        const getFriend = await db.friends.get(id) as Friend;
                        expect(friend.id).toBeUndefined();
                        expect(getFriend!.id).toBeTruthy();
                    });
                });
            }

            if (database.encrypted) {
                describe('Encrypted', () => {
                    it('should hash id', async () => {
                        const getFriend = await db.friends.get(id) as Friend;
                        if (friend.id) { delete friend.id; }
                        const hashId = Encryption.hash(friend);
                        expect(getFriend.id).toBe(hashId);
                    });
                    it('should encrypt firstName', async () => {
                        const iDb = db.backendDB();
                        const hashedId = Encryption.hash(friend);
                        const request = iDb.transaction('friends', 'readonly').objectStore('friends').get(hashedId);
                        await new Promise(resolve => request.onsuccess = resolve);
                        const friendRaw = request.result;
                        expect(Object.keys(friendRaw)).toEqual(jasmine.arrayContaining(Object.keys(friend)));
                        expect(friendRaw!.firstName).not.toBe(friend.firstName);
                    });
                    it('should encrypt / decrypt firstName', async () => {
                        const getFriend = await db.friends.get(id) as Friend;
                        expect(getFriend).toEqual(friendExpected);
                    });
                });
            }

            describe('Rxjs', () => {
                it('should have db.changes$', () => {
                    expect(db.changes$ instanceof Observable).toBeTruthy();
                });
                it('should have $ class', () => {
                    expect(db.friends.$).toBeTruthy();
                });
                it('should be able to get an observable', async () => {
                    const friendObs = await db.friends.$.get(id).pipe(take(1)).toPromise();
                    expect(friendObs).toEqual(friendExpected);
                });
                it('should not be an observable', async () => {
                    const getFriend = await db.friends.get(id);
                    expect(getFriend instanceof Observable).toBeFalse();
                    expect(getFriend).toEqual(friendExpected);
                });
            });
            describe('Populate', () => {
                it('should have populate class', () => {
                    expect(db.friends.populate()).toBeTruthy();
                });
                it('should be populated', async () => {
                    const friendPop = await db.friends.populate().get(id);
                    expect(friendPop).toEqual(friendExpectedPop);
                });
                it('should not be populated', async () => {
                    const friendPop = await db.friends.get(id);
                    expect(friendPop).toEqual(friendExpected);
                });
            });
            describe('Populate - Observable', () => {
                it('should have table with populate().$', async () => {
                    expect(db.friends.populate().$).toBeTruthy();
                });
                it('should have table with $.populate()', async () => {
                    expect(db.friends.$.populate()).toBeTruthy();
                });
                it('should be the same result', async () => {
                    expect(db.friends.$.populate() instanceof PopulateTableObservable).toBeTrue();
                    expect(db.friends.populate().$ instanceof PopulateTableObservable).toBeTrue();
                });
                const methods = [
                    {
                        desc: 'populate().$',
                        method: (dbInput: typeof db) => dbInput.friends.populate().$
                    },
                    {
                        desc: '$.populate()',
                        method: (dbInput: typeof db) => dbInput.friends.$.populate()
                    }
                ];
                methods.forEach(_method => {
                    describe(_method.desc, () => {
                        // let method: ReturnType<typeof _method.method>;
                        // beforeEach(async () => {
                        //     method = _method.method(db);
                        // });
                        it('should be an observable', async () => {
                            const method = _method.method(db);
                            const obs$ = method.get(id);
                            expect(obs$ instanceof Observable).toBeTrue();
                        });
                        it('should be open', async () => {
                            const method = _method.method(db);
                            const obs$ = method.get(id);
                            let sub = new Subscription();
                            const emitPromise = new Promise(resolve => {
                                sub = subs.add(obs$.subscribe(
                                    () => resolve()
                                ));
                            });
                            await emitPromise;
                            expect(sub.closed).toBe(false);
                        });
                        it('should emit the correct value', async () => {
                            const method = _method.method(db);
                            const getFriend = await method.get(id).pipe(take(1)).toPromise();
                            expect(getFriend).toEqual(friendExpectedPop);

                            const [newFriend] = mockFriends(1);
                            const newId = await db.friends.add(newFriend);
                            const getNewFriend = await method.get(newId).pipe(take(1)).toPromise();
                            expect({ ...getNewFriend }).toEqual({ ...newFriend, id: newId });

                            const getOldFriend = await method.get(id).pipe(take(1)).toPromise();
                            expect(getOldFriend).toEqual(friendExpectedPop);
                        });
                        it('should emit on record update', async () => {
                            const method = _method.method(db);
                            let emitCount = 0;
                            let obsFriend: Populated<Friend, false, string> | undefined;
                            const emitPromise = new Promise(resolve => {
                                subs.add(method.get(id).subscribe(
                                    friendEmit => {
                                        emitCount++;
                                        obsFriend = friendEmit;
                                        if (emitCount === 2) { resolve(); }
                                    }
                                ));
                            });
                            await db.friends.update(id, { firstName: 'TestieUpdate' });
                            await emitPromise;
                            expect(emitCount).toBe(2);
                            expect({ ...obsFriend }).toEqual({ ...friendExpectedPop, firstName: 'TestieUpdate' });
                        });
                        it('should emit undefined on record delete', async () => {
                            const method = _method.method(db);
                            let emitCount = 0;
                            let obsFriend: Populated<Friend, false, string> | undefined;

                            const waits = new Array(2).fill(null).map(() => flatPromise());
                            subs.add(method.get(id).subscribe(
                                friendEmit => {
                                    emitCount++;
                                    obsFriend = friendEmit;
                                    switch (emitCount) {
                                        case 1: waits[0].resolve(); break;
                                        case 2: waits[1].resolve(); break;
                                    }
                                }));

                            await waits[0].promise;
                            expect(emitCount).toBe(1);
                            expect(obsFriend).toEqual(friendExpectedPop);
                            await db.friends.delete(id);
                            await waits[1].promise;
                            expect(emitCount).toBe(2);
                            expect(obsFriend).toBe(undefined);
                        });
                        it('should emit undefined on record delete (slowed)', async () => {
                            const method = _method.method(db);
                            let emitCount = 0;
                            let obsFriend: Populated<Friend, false, string> | undefined;

                            const waits = new Array(2).fill(null).map(() => flatPromise());
                            subs.add(method.get(id).subscribe(
                                friendEmit => {
                                    emitCount++;
                                    obsFriend = friendEmit;
                                    switch (emitCount) {
                                        case 1: waits[0].resolve(); break;
                                        case 2: waits[1].resolve(); break;
                                    }
                                }));

                            await waits[0].promise;
                            expect(emitCount).toBe(1);
                            expect(obsFriend).toEqual(friendExpectedPop);

                            // Slow down to force two emits from db.changes$
                            await new Promise(resolve => setTimeout(() => resolve(), 500));

                            await db.friends.delete(id);
                            await waits[1].promise;
                            expect(emitCount).toBe(2);
                            expect(obsFriend).toBe(undefined);
                        });
                        it('should emit undefined when id is not found', async () => {
                            const method = _method.method(db);
                            let emitCount = 0;
                            let obsFriend: Populated<Friend, false, string> | undefined;
                            const emitPromise = new Promise(resolve => {
                                subs.add(method.get('dsfsdfsdfsdfsdfsdfsdf').subscribe(
                                    friendEmit => {
                                        emitCount++;
                                        obsFriend = friendEmit;
                                        if (emitCount === 1) { resolve(); }
                                    }
                                ));
                            });
                            await emitPromise;
                            expect(obsFriend).toBe(undefined);
                        });
                        it('should emit when record is created after subscribe', async () => {
                            const method = _method.method(db);
                            const [newFriend] = mockFriends(1);
                            const lastId = await db.friends.add(mockFriends(1)[0]);
                            const newId = database.encrypted ? Encryption.hash(newFriend) : lastId + 1;
                            let emitCount = 0;
                            let obsFriend: Populated<Friend, false, string> | undefined;
                            const emitPromise = new Promise(resolve => {
                                subs.add(method.get(newId).subscribe(
                                    friendEmit => {
                                        emitCount++;
                                        obsFriend = friendEmit;
                                        if (emitCount === 2) { resolve(); }
                                    }
                                ));
                            });
                            await db.friends.add(newFriend);
                            await emitPromise;
                            expect({ ...obsFriend }).toEqual({ ...newFriend, id: newId } as Populated<Friend, false, string>);
                        });
                        it('should not emit when no changes', async () => {
                            const method = _method.method(db);
                            const newFriends = mockFriends(50);
                            const newIds = await db.friends.bulkAdd(newFriends, { allKeys: true });

                            const idx1 = faker.random.number({ min: 0, max: 9 });
                            const id1 = newIds[idx1];
                            let emitCount = 0;

                            const waits = new Array(4).fill(null).map(() => flatPromise());
                            subs.add(method.get(id1).subscribe(
                                () => {
                                    emitCount++;
                                    switch (emitCount) {
                                        case 1:
                                            waits[0].resolve();
                                            break;
                                        case 2:
                                            waits[1].resolve();
                                            waits[2].resolve();
                                            waits[3].resolve();
                                            break;
                                    }
                                }
                            ));
                            // First emit
                            await waits[0].promise;
                            expect(emitCount).toBe(1);

                            // Update different record
                            const idx2 = faker.random.number({ min: 10, max: 19 });
                            const id2 = newIds[idx2];
                            await db.friends.update(id2, { firstName: 'Testie' });
                            setTimeout(() => waits[1].resolve(), 500);
                            await waits[1].promise;
                            expect(emitCount).toBe(1);

                            // Update record with same data
                            await db.friends.update(id1, newFriends[idx1]);
                            setTimeout(() => waits[2].resolve(), 500);
                            await waits[2].promise;
                            expect(emitCount).toBe(1);

                            // Update record with different data
                            await db.friends.update(id1, { firstName: 'Testie' });
                            await waits[3].promise;
                            expect(emitCount).toBe(2);
                        });
                        it('should emit when populated property is updated', async () => {
                            const method = _method.method(db);
                            let emitCount = 0;
                            let obsFriend: Populated<Friend, false, string> | undefined;

                            const waits = new Array(6).fill(null).map(() => flatPromise());
                            subs.add(method.get(id).subscribe(
                                friendEmit => {
                                    emitCount++;
                                    obsFriend = friendEmit;
                                    waits[emitCount - 1].resolve();
                                }));

                            await waits[0].promise;
                            expect(emitCount).toBe(1);
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.clubs.update(clubIds[1], { name: 'Testie name' });
                            await waits[1].promise;
                            expect(emitCount).toBe(2);
                            friendExpectedPop.memberOf[1]!.name = 'Testie name';
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.themes.update(themeIds[1], { name: 'Testie name' });
                            await waits[2].promise;
                            expect(emitCount).toBe(3);
                            friendExpectedPop.memberOf[1]!.theme!.name = 'Testie name';
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.friends.update(id, { group: groupIds[4] });
                            await waits[3].promise;
                            expect(emitCount).toBe(4);
                            friendExpectedPop.group = groups[4];
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.friends.update(id, { firstName: 'Testie name' });
                            await waits[4].promise;
                            expect(emitCount).toBe(5);
                            friendExpectedPop.firstName = 'Testie name';
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.groups.update(groupIds[2], { name: 'Testie name' });
                            await waits[5].promise;
                            expect(emitCount).toBe(6);
                            friendExpectedPop.hasFriends[0]!.group!.name = 'Testie name';
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await new Promise(resolve => setTimeout(() => resolve(), 500));
                            expect(emitCount).toBe(6);
                        });
                        it('should emit when updating a nested populated id, then update update this record', async () => {
                            const method = _method.method(db);
                            let emitCount = 0;
                            let obsFriend: Populated<Friend, false, string> | undefined;
                            const newGroups = mockGroups();
                            const newGroupIds = await db.groups.bulkAdd(newGroups, { allKeys: true });

                            const waits = new Array(6).fill(null).map(() => flatPromise());
                            subs.add(method.get(id).subscribe(
                                friendEmit => {
                                    emitCount++;
                                    obsFriend = friendEmit;
                                    waits[emitCount - 1].resolve();
                                }));

                            await waits[0].promise;
                            expect(emitCount).toBe(1);
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.friends.update(ids[1], { group: newGroupIds[1] });
                            await waits[1].promise;
                            expect(emitCount).toBe(2);
                            newGroups[1].id = newGroupIds[1];
                            friendExpectedPop.hasFriends[0]!.group! = newGroups[1];
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.groups.update(newGroupIds[1], { name: 'Testie name' });
                            await waits[2].promise;
                            expect(emitCount).toBe(3);
                            friendExpectedPop.hasFriends[0]!.group!.name = 'Testie name';
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await new Promise(resolve => setTimeout(() => resolve(), 500));
                            expect(emitCount).toBe(3);
                        });
                        it('should not emit when other populated properties are updated', async () => {
                            const method = _method.method(db);
                            let emitCount = 0;
                            let obsFriend: Populated<Friend, false, string> | undefined;

                            const newClubIds = await db.clubs.bulkAdd(mockClubs(), { allKeys: true });
                            const newThemeIds = await db.themes.bulkAdd(mockThemes(), { allKeys: true });
                            const newGroupIds = await db.groups.bulkAdd(mockGroups(), { allKeys: true });

                            const waits = new Array(4).fill(null).map(() => flatPromise());
                            subs.add(method.get(id).subscribe(
                                friendEmit => {
                                    emitCount++;
                                    obsFriend = friendEmit;
                                    waits[emitCount - 1].resolve();
                                }));

                            await waits[0].promise;
                            expect(emitCount).toBe(1);
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.clubs.update(newClubIds[2], { name: 'Testie name' });
                            setTimeout(() => waits[1].resolve(), 500);
                            await waits[1].promise;
                            expect(emitCount).toBe(1);
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.themes.update(newThemeIds[2], { name: 'Testie name' });
                            setTimeout(() => waits[2].resolve(), 500);
                            await waits[2].promise;
                            expect(emitCount).toBe(1);
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await db.groups.update(newGroupIds[2], { name: 'Testie name' });
                            setTimeout(() => waits[3].resolve(), 500);
                            await waits[3].promise;
                            expect(emitCount).toBe(1);
                            expect(obsFriend).toEqual(friendExpectedPop);

                            await new Promise(resolve => setTimeout(() => resolve(), 500));
                            expect(emitCount).toBe(1);
                        });
                        describe('Array methods', () => {
                            it('should be an array', async () => {
                                const method = _method.method(db);
                                const getFriends1 = await method.toArray().pipe(take(1)).toPromise();
                                expect(Array.isArray(getFriends1)).toBeTrue();
                                const getFriends2 = await method.where(':id').anyOf(ids).toArray().pipe(take(1)).toPromise();
                                expect(Array.isArray(getFriends2)).toBeTrue();
                            });
                            it('should populate an entire table', async () => {
                                const method = _method.method(db);
                                const getFriendsPromises = await Promise.all([
                                    method.toArray().pipe(take(1)).toPromise(),
                                    method.where(':id').anyOf(ids).toArray().pipe(take(1)).toPromise()
                                ]);

                                getFriendsPromises.forEach(getFriends => {
                                    const friendPop = getFriends.find(x => x.id === id);

                                    expect(friendPop).toEqual(friendExpectedPop);

                                    expect(getFriends.some(x => x.hasFriends.length)).toBeTrue();
                                    expect(getFriends.some(x => x.memberOf.length)).toBeTrue();
                                    expect(getFriends.some(x => x.group instanceof Group));
                                    getFriends.forEach(x => {
                                        expect(x.hasFriends.every(y => y instanceof Friend)).toBeTrue();
                                        expect(x.memberOf.every(y => y instanceof Club)).toBeTrue();
                                        expect(x.hasFriends.some(z => z?.hasFriends.length));
                                        x.hasFriends.forEach(y => expect(y?.hasFriends.every(z => z instanceof Friend)).toBeTrue());
                                    });
                                });
                            });
                            it('should emit [] when nothing is not found', async () => {
                                const method = _method.method(db);
                                let emitCount = 0;
                                let obsFriend: Populated<Friend, false, string>[] | undefined;
                                const emitPromise = new Promise(resolve => {
                                    subs.add(method.where(':id').equals(99999999999).toArray().subscribe(
                                        friendEmit => {
                                            emitCount++;
                                            obsFriend = friendEmit;
                                            if (emitCount === 1) { resolve(); }
                                        }
                                    ));
                                });
                                await emitPromise;
                                expect(obsFriend).toEqual([]);
                            });
                        });
                        describe('Indices', () => {
                            it('should index memberOf', async () => {
                                const method = _method.method(db);
                                const getFriend = await method.get({ group: groupIds[1] }).pipe(take(1)).toPromise();
                                expect(getFriend).toEqual(friendExpectedPop);
                            });
                            it('should multiIndex memberOf', async () => {
                                const method = _method.method(db);
                                const getFriend = await method.get({ memberOf: clubIds[1] }).pipe(take(1)).toPromise();
                                expect(getFriend).toEqual(friendExpectedPop);
                            });
                        });
                        describe('Compound index', () => {
                            it('should index [id+group]', async () => {
                                const method = _method.method(db);
                                const getFriend = await method.get({ id, group: groupIds[1] }).pipe(take(1)).toPromise();
                                expect(getFriend).toEqual(friendExpectedPop);

                                const [getFriendWhere] = await method
                                    .where('[id+group]')
                                    .equals([id, groupIds[1]])
                                    .toArray()
                                    .pipe(take(1))
                                    .toPromise();
                                expect(getFriendWhere).toEqual(friendExpectedPop);
                            });
                        });
                    });
                });
            });
        });
    });
});

describe('Addon-suite function', () => {
    it('should be able to provide config via setConfig', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });
        const func = addonSuite.setConfig({ immutable: false });
        func(new Dexie('TestieDb'));
        expect(addons).toEqual(['rxjs', 'populate']);
    });
    it('should always load default addons', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });
        addonSuite(new Dexie('TestieDb'));
        expect(addons).toEqual(['immutable', 'rxjs', 'populate']);
    });
    it('should not crash on wrong config', async () => {
        expect(() => addonSuite(new Dexie('TestieDb'), { immutable: 34 } as any)).not.toThrow();
    });
    it('should load encrypted with secretKey config', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });

        addonSuite(new Dexie('TestieDb'), { secretKey: 'sdfsdf' });
        expect(addons).toEqual(['immutable', 'encrypted', 'rxjs', 'populate']);
    });
    it('should load encrypted and not load immutable with secretKey config', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });

        addonSuite(new Dexie('TestieDb'), { secretKey: 'sdfsdf', immutable: false });
        expect(addons).toEqual(['encrypted', 'rxjs', 'populate']);
    });
    it('should load encrypted with immutable', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });

        addonSuite(new Dexie('TestieDb'), { encrypted: { secretKey: 'sdfsdfsfwefwcv' } });
        expect(addons).toEqual(['immutable', 'encrypted', 'rxjs', 'populate']);
    });
    it('should load encrypted without immutable', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });

        addonSuite(new Dexie('TestieDb'), { encrypted: { secretKey: 'sdfsdfsfwefwcv', immutable: false } });
        expect(addons).toEqual(['encrypted', 'rxjs', 'populate']);
    });
    it('should load default without immutable', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });

        addonSuite(new Dexie('TestieDb'), { immutable: false });
        expect(addons).toEqual(['rxjs', 'populate']);
    });
    it('should overwrite immutable from encrypted', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });

        addonSuite(new Dexie('TestieDb'), {
            immutable: false,
            encrypted: { secretKey: 'sdfsdf', immutable: true }
        });
        expect(addons).toEqual(['immutable', 'encrypted', 'rxjs', 'populate']);
    });
    it('should not overwrite immutable from encrypted', async () => {
        const addons: string[] = [];
        spyOn(addonSuiteModule, 'loadAddon').and.callFake(key => {
            addons.push(key);
        });

        addonSuite(new Dexie('TestieDb'), {
            immutable: true,
            encrypted: { secretKey: 'sdfsdf', immutable: false }
        });
        expect(addons).toEqual(['encrypted', 'rxjs', 'populate']);
    });
});

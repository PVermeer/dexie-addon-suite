// tslint:disable: no-non-null-assertion
import { Populated } from '@pvermeer/dexie-populate-addon';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Encryption } from '../../../src/index';
import { Club, Friend, Group, HairColor, mockClubs, mockFriends, mockGroups, mockHairColors, mockStyles, mockThemes, Style, TestDatabase, Theme } from '../../mocks/mocks';

describe('Suite', () => {
    let db: TestDatabase;
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
        db = new TestDatabase('TestDatabase');
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
                    .toEqual(jasmine.stringMatching('cloneDeep'));
            });
        });
        it('should not change input object', async () => {
            const getFriend = await db.friends.get(id) as Friend;
            expect(friend.id).toBeUndefined();
            expect(getFriend!.id).toBeTruthy();
        });
    });

    describe('Encrypted', () => {
        it('should hash id', async () => {
            const getFriend = await db.friends.get(id) as Friend;
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

    describe('Rxjs', () => {
        it('should have db.changes$', () => {
            expect(db.changes$ instanceof Observable).toBeTruthy();
        });
        it('should have $ class', () => {
            expect(db.friends.$).toBeTruthy();
        });
        it('should decrypt firstName', async () => {
            const friendObs = await db.friends.$.get(id).pipe(take(1)).toPromise();
            expect(friendObs).toEqual(friendExpected);
        });
        it('should have table with populate().$', async () => {
            expect(db.friends.populate().$).toBeTruthy();
        });
        it('should be able to get a populated observable', async () => {
            const getFriend = await db.friends.populate().$.get(id).pipe(take(1)).toPromise();
            expect(getFriend).toEqual(friendExpectedPop);
        });
    });

    describe('Populate', () => {
        it('should have populate class', () => {
            expect(db.friends.populate()).toBeTruthy();
        });
        it('should decrypt firstName', async () => {
            const friendPop = await db.friends.populate().get(id);
            expect(friendPop).toEqual(friendExpectedPop as any);
        });
        it('should have table with $.populate()', async () => {
            expect(db.friends.$.populate()).toBeTruthy();
        });
        it('should be able to get a populated observable', async () => {
            const getFriend = await db.friends.$.populate().get(id).pipe(take(1)).toPromise();
            expect(getFriend).toEqual(friendExpectedPop);
        });
    });
});

// tslint:disable: no-non-null-assertion
import { Populated } from '@pvermeer/dexie-populate-addon';
import type DexieType from 'dexie';
import { Subscription } from 'rxjs';
import type * as rxjsImport from 'rxjs';
import type * as rxjsOperators from 'rxjs/operators';
import type { addonSuite } from '../../../src';
import { Club, databasesPositive, Friend, Group, HairColor, mockClubs, mockFriends, mockGroups, mockHairColors, mockStyles, mockThemes, Style, Theme } from '../../mocks/mocks';

declare interface DexieAddonSuite { addonSuite: typeof addonSuite; }
declare const Dexie: typeof DexieType;
declare const rxjs: typeof rxjsImport & { operators: typeof rxjsOperators };
declare const DexieAddonSuite: DexieAddonSuite;

describe('HTML script tag', () => {
    beforeAll(async () => {
        await Promise.all([
            await new Promise(resolve => {
                const script = document.createElement('script');
                console.warn('Still using dexie@next HTML import !!!!!!!!!!!!!!!!!!!!!!!!');
                script.src = 'https://unpkg.com/dexie@next/dist/dexie.js';
                script.type = 'text/javascript';
                script.onload = () => resolve();
                document.head.append(script);
            }),
            await new Promise(resolve => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/rxjs/bundles/rxjs.umd.min.js';
                script.type = 'text/javascript';
                script.onload = () => resolve();
                document.head.append(script);
            })
        ]);
        await new Promise(resolve => {
            const script = document.createElement('script');
            script.src = `/base/dist/dexie-addon-suite.min.js`;
            script.type = 'text/javascript';
            script.onload = () => resolve();
            document.head.append(script);
        });
    });
    it('should load Dexie.js', () => {
        expect(Dexie).toBeTruthy();
    });
    it('should load RxJs', () => {
        expect(rxjs).toBeTruthy();
        expect(rxjs.operators).toBeTruthy();
    });
    it('should load the addon', () => {
        expect(DexieAddonSuite).toBeTruthy();
        expect(DexieAddonSuite.addonSuite).toBeTruthy();
    });
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
            it('should be able to use normally', async () => {
                const getFriend = await db.friends.get(id);
                expect(getFriend).toEqual(friendExpected);
                await db.delete();
            });
            it('should be able to get an observable', async () => {
                const getFriend = await db.friends.$.get(id).pipe(rxjs.operators.take(1)).toPromise();
                expect(getFriend).toEqual(friendExpected);
            });
            it('should be able to get a populated result', async () => {
                const getFriend = await db.friends.populate().get(id);
                expect(getFriend).toEqual(friendExpectedPop);
            });
            it('should be able to get a populated observable', async () => {
                const getFriend = await db.friends.$.populate().get(id).pipe(rxjs.operators.take(1)).toPromise();
                expect(getFriend).toEqual(friendExpectedPop);
            });
        });
    });
});

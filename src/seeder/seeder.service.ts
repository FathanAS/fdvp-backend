
import { Inject, Injectable } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { faker } from '@faker-js/faker';

@Injectable()
export class SeederService {
    constructor(@Inject('FIREBASE_CONNECTION') private firestore: Firestore) { }

    async seedUsers(count: number = 10) {
        const batchSize = 100;
        const batches: Promise<any>[] = [];
        let currentBatch = this.firestore.batch();
        let counter = 0;

        for (let i = 0; i < count; i++) {
            const userRef = this.firestore.collection('users').doc();

            // Random Indonesia Location (Approximate)
            // Lat: -11 to 6
            // Long: 95 to 141
            const lat = faker.location.latitude({ min: -10, max: 5 });
            const long = faker.location.longitude({ min: 100, max: 120 }); // Focus on Java/Sumatra/Kalimantan area for better density


            // ARKNIGHTS FEMALE OPERATORS POOL (Real Image URLs via Aceship)
            // Using reliable ID mapping for Aceship CDN
            const arknightsOperators = [
                { name: 'Amiya', job: 'Rhodes Island Leader', id: 'char_002_amiya', bio: 'I will be the one to protect you, Doctor.' },
                { name: "Kal'tsit", job: 'Medical Director', id: 'char_003_kalts', bio: 'Do not simply seek death.' },
                { name: "Ch'en", job: 'LGD Superintendent', id: 'char_010_chen', bio: 'Justice will be served.' },
                { name: 'Hoshiguma', job: 'LGD Inspector', id: 'char_136_hsguma', bio: 'My shield is yours.' },
                { name: 'Exusiai', job: 'Penguin Logistics', id: 'char_103_angel', bio: 'Apple Pie!' },
                { name: 'Texas', job: 'Penguin Logistics', id: 'char_102_texas', bio: '...' },
                { name: 'Lappland', job: 'Vanguard', id: 'char_140_whitew', bio: 'I like seeing people struggle.' },
                { name: 'Specter', job: 'Nun', id: 'char_143_ghost', bio: 'Listen to the whispers...' },
                { name: 'Skadi', job: 'Bounty Hunter', id: 'char_263_skadi', bio: 'Do not approach me.' },
                { name: 'Siege', job: 'Glasgow Gang Leader', id: 'char_112_siege', bio: 'Follow my lead.' },
                { name: 'Shining', job: 'Confessor', id: 'char_147_shining', bio: 'May the light guide you.' },
                { name: 'Nightingale', job: 'Healer', id: 'char_179_cgbird', bio: '...' },
                { name: 'Eyjafjalla', job: 'Volcanologist', id: 'char_180_amgoat', bio: 'Senpai...' },
                { name: 'Ifrit', job: 'Pyromaniac', id: 'char_134_ifrit', bio: 'Burn everything!' },
                { name: 'Saria', job: 'Defense Director', id: 'char_202_demnk', bio: 'Logic holds everything together.' },
                { name: 'Silence', job: 'Researcher', id: 'char_108_silent', bio: 'Don\'t disturb my research.' },
                { name: 'Ptilopsis', job: 'Data Analyst', id: 'char_128_plosis', bio: 'System restoring...' },
                { name: 'Blue Poison', job: 'Toxin Expert', id: 'char_129_bluep', bio: 'Would you like some cake?' },
                { name: 'Platinum', job: 'Assassin', id: 'char_204_platnm', bio: 'Target sighted.' },
                { name: 'Meteorite', job: 'Mercenary', id: 'char_219_meteo', bio: 'Fire in the hole!' },
                { name: 'Gravel', job: 'Bodyguard', id: 'char_237_gravel', bio: 'At your service, Knight.' },
                { name: 'Projekt Red', job: 'Wolf Hunter', id: 'char_144_red', bio: 'I want to touch tails.' },
                { name: 'Angelina', job: 'Messenger', id: 'char_291_aglina', bio: 'Gravity is my friend.' },
                { name: 'Mostima', job: 'Messenger', id: 'char_213_mostma', bio: 'Time flows differently here.' },
                { name: 'Blaze', job: 'Elite Operator', id: 'char_017_onigir', bio: 'Let\'s rock!' },
                { name: 'W', job: 'Mercenary Leader', id: 'char_113_cqbw', bio: 'Bang!' },
                { name: 'Mudrock', job: 'Sarkaz Mercenary', id: 'char_311_mudrock', bio: 'For the infected.' },
                { name: 'Surtr', job: 'Memory Seeker', id: 'char_350_surtr', bio: 'Do you know me?' },
                { name: 'Rosmontis', job: 'Elite Operator', id: 'char_391_rosmon', bio: 'I will destroy them.' },
                { name: 'Ceobe', job: 'Weapon Master', id: 'char_2013_cerber', bio: 'Dadadada!' },
                { name: 'Bagpipe', job: 'Soldier', id: 'char_222_bpipe', bio: 'For Victoria!' },
                { name: 'Liskarm', job: 'Security', id: 'char_107_liskam', bio: 'Shield deployed.' },
                { name: 'Swire', job: 'Superintendent', id: 'char_308_swire', bio: 'Gao!' },
                { name: 'Schwarz', job: 'Bodyguard', id: 'char_340_shwaz', bio: 'Lady Ceylon is my priority.' },
                { name: 'Sora', job: 'Idol', id: 'char_101_sora', bio: 'Listen to my song!' },
                { name: 'Zima', job: 'Student General', id: 'char_115_headbr', bio: 'Ursus is strong.' },
                { name: 'Istina', job: 'Student', id: 'char_195_glassb', bio: 'Knowledge is power.' },
                { name: 'Gummy', job: 'Chef', id: 'char_196_sunbr', bio: 'Cooking time!' },
                { name: 'Feater', job: 'Kung Fu Master', id: 'char_241_panda', bio: 'Hiyah!' },
                { name: 'Cliffheart', job: 'Mountaineer', id: 'char_173_slchan', bio: 'Let\'s climb!' },
                { name: 'Pramanix', job: 'Saintess', id: 'char_174_slbell', bio: 'Kjerag bless you.' },
                { name: 'Matoimaru', job: 'Samurai', id: 'char_289_gyuki', bio: 'Honor above all.' },
                { name: 'Melantha', job: 'Reserve Captain', id: 'char_208_melan', bio: 'KyostinV uses me.' },
                { name: 'Cardigan', job: 'Reserve Defender', id: 'char_209_ardign', bio: 'I will protect everyone!' }
            ];

            const character = faker.helpers.arrayElement(arknightsOperators);
            // Append random suffix to name to ensure uniqueness if seeding many
            const uniqueName = character.name; // Keep accurate anime names, duplicates allowed or add small seed if strictly needed: `${character.name} ${faker.string.numeric(3)}`; 

            // Generate clean username from name
            const cleanUsername = character.name.replace(/[^a-zA-Z]/g, '').toLowerCase() + faker.string.numeric(3);

            const userData = {
                id: userRef.id,
                displayName: `${character.name} ${faker.string.numeric(2)}`, // Add small number to differentiate duplicates
                username: cleanUsername,
                email: faker.internet.email({ firstName: cleanUsername, lastName: 'rhodes' }),
                photoURL: `https://raw.githubusercontent.com/Aceship/Arknight-Images/master/avatars/${character.id}.png`,
                job: character.job,
                role: faker.helpers.arrayElement(['user', 'user', 'user', 'user', 'staff', 'manager']), // Mostly users
                isDummy: true,
                latitude: lat,
                longitude: long,
                city: faker.location.city(),
                province: faker.location.state(),
                bio: character.bio,
                createdAt: faker.date.past().toISOString(),
                visitorCount: faker.number.int({ min: 0, max: 10000 }),
                instagram: cleanUsername,
                linkedin: '',
                twitter: ''
            };

            currentBatch.set(userRef, userData);
            counter++;

            if (counter === batchSize) {
                batches.push(currentBatch.commit());
                currentBatch = this.firestore.batch();
                counter = 0;
            }
        }

        if (counter > 0) {
            batches.push(currentBatch.commit());
        }

        await Promise.all(batches);
        return { message: `Successfully seeded ${count} dummy users` };
    }

    async deleteDummyUsers() {
        // Delete in batches
        const limit = 200;
        let deletedCount = 0;

        while (true) {
            const snapshot = await this.firestore.collection('users')
                .where('isDummy', '==', true)
                .limit(limit)
                .get();

            if (snapshot.empty) break;

            const batch = this.firestore.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            deletedCount += snapshot.size;
        }

        return { message: `Successfully deleted ${deletedCount} dummy users` };
    }
}

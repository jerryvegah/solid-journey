const admin = require('firebase-admin');
const serviceAccount = require('./agricheck-83fe1-firebase-adminsdk-fbsvc-ff9eda89c8.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Contract Templates Data
const inputPackages = [
    {
        id: 'maize_standard_2026',
        data: {
            cropType: 'Maize',
            packageName: 'Maize Production Contract',
            totalInputValue: 2100,
            produceRepaymentPerAcre: 6,
            produceType: 'Grade A White Maize',
            bagWeight: 100,
            repaymentTimeline: 'Within 14 days of harvest completion',
            inputsIncluded: [
                {
                    productId: 'hybrid_maize_seed',
                    productName: 'Hybrid Maize Seed Pack (4 packs)',
                    quantity: 4
                },
                {
                    productId: 'npk_compound',
                    productName: 'NPK Compound Fertilizer 50kg',
                    quantity: 2
                },
                {
                    productId: 'urea_fertilizer',
                    productName: 'Urea Fertilizer 50kg',
                    quantity: 2
                }
            ],
            marginPercentage: 25,
            description: 'Full Input Package for 1 Acre of Maize. Includes hybrid seeds, NPK compound, and Urea fertilizer. Repayment: 6 bags (100kg each) of Grade A White Maize.',
            active: true
        }
    },
    {
        id: 'soybean_booster_2026',
        data: {
            cropType: 'Soybean',
            packageName: 'Soybean Booster Contract',
            totalInputValue: 1100,
            produceRepaymentPerAcre: 3.5,
            produceType: 'Clean, Dried Soybean',
            bagWeight: 100,
            repaymentTimeline: 'Within 21 days of harvest',
            inputsIncluded: [
                {
                    productId: 'soybean_booster_pack',
                    productName: 'Soybean Booster Pack (Seed + Inoculant)',
                    quantity: 1
                },
                {
                    productId: 'liquid_organic_fertilizer',
                    productName: 'Liquid Organic Fertilizer (4L)',
                    quantity: 1
                },
                {
                    productId: 'foliar_spray',
                    productName: 'Foliar Spray',
                    quantity: 1
                }
            ],
            marginPercentage: 28,
            description: 'Specialized Soya Yield Booster Pack. Includes seeds with inoculant, liquid organic fertilizer, and foliar spray. Repayment: 3.5 bags (100kg each) of clean, dried Soybean.',
            active: true
        }
    },
    {
        id: 'rice_grower_2026',
        data: {
            cropType: 'Rice',
            packageName: 'Rice Grower Contract',
            totalInputValue: 2500,
            produceRepaymentPerAcre: 8,
            produceType: 'Paddy Rice (unmilled)',
            bagWeight: 100,
            repaymentTimeline: 'Immediately upon threshing',
            inputsIncluded: [
                {
                    productId: 'certified_paddy_seed',
                    productName: 'Certified Paddy Seed (40kg)',
                    quantity: 1
                },
                {
                    productId: 'npk_compound',
                    productName: 'NPK Compound Fertilizer 50kg',
                    quantity: 3
                },
                {
                    productId: 'urea_fertilizer',
                    productName: 'Urea Fertilizer 50kg',
                    quantity: 2
                }
            ],
            marginPercentage: 30,
            description: 'High-Yield Paddy Rice Input Bundle. Includes certified paddy seed and heavy fertilization (NPK + Urea). Repayment: 8 bags (100kg each) of Paddy Rice (unmilled).',
            active: true
        }
    },
    {
        id: 'sorghum_resilience_2026',
        data: {
            cropType: 'Sorghum',
            packageName: 'Sorghum Resilience Contract',
            totalInputValue: 1300,
            produceRepaymentPerAcre: 4.5,
            produceType: 'Sorghum Grain',
            bagWeight: 100,
            repaymentTimeline: 'Post-harvest drying phase',
            inputsIncluded: [
                {
                    productId: 'improved_sorghum_seed',
                    productName: 'Improved Sorghum Seed (5kg)',
                    quantity: 1
                },
                {
                    productId: 'npk_compound',
                    productName: 'NPK Compound Fertilizer 50kg',
                    quantity: 2
                },
                {
                    productId: 'liquid_organic_fertilizer',
                    productName: 'Liquid Organic Fertilizer (2L)',
                    quantity: 1
                }
            ],
            marginPercentage: 22,
            description: 'Climate-Resistant Sorghum Bundle. Includes improved sorghum seed, NPK compound, and liquid organic fertilizer. Repayment: 4.5 bags (100kg each) of Sorghum Grain.',
            active: true
        }
    }
];

// Seed the database
async function seedInputPackages() {
    console.log('🌱 Starting to seed InputPackages collection...\n');

    try {
        for (const pkg of inputPackages) {
            console.log(`📦 Adding ${pkg.data.packageName}...`);

            await db.collection('InputPackages').doc(pkg.id).set(pkg.data);

            console.log(`✅ Successfully added: ${pkg.id}\n`);
        }

        console.log('🎉 All InputPackages have been seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Total packages added: ${inputPackages.length}`);
        console.log(`   - Maize: 6 bags/acre | GH₵ 2,100`);
        console.log(`   - Soybean: 3.5 bags/acre | GH₵ 1,100`);
        console.log(`   - Rice: 8 bags/acre | GH₵ 2,500`);
        console.log(`   - Sorghum: 4.5 bags/acre | GH₵ 1,300`);
        console.log('\n✨ Your BNPL system is now ready to use!');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the seed function
seedInputPackages();

import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from './firebase';

export interface InputPackage {
    id: string;
    cropType: string;
    packageName: string;
    totalInputValue: number;
    produceRepaymentPerAcre: number;
    produceType: string;
    bagWeight: number;
    repaymentTimeline: string;
    inputsIncluded: Array<{
        productId: string;
        productName: string;
        quantity: number;
    }>;
    marginPercentage: number;
    description: string;
    active: boolean;
}

export interface FarmerContract {
    id: string;
    userId: string; // CHANGED: from farmerId to userId to match Firestore rules
    farmerEmail: string;
    packageId: string;
    cropType: string;
    totalAcres: number;
    totalProduceDue: number;
    farmBoundary: string;
    fieldLocation: string;
    status: 'Pending' | 'Active' | 'Harvested' | 'Completed' | 'Defaulted';
    termsAccepted: boolean;
    termsAcceptedAt?: any;
    signedAt?: any;
    expectedHarvestDate?: string;
    actualHarvestDate?: string;
    createdAt: any;
    updatedAt: any;
}

/**
 * Get all available input packages
 */
export async function getInputPackages(): Promise<InputPackage[]> {
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return [];
        }

        console.log('📡 Fetching active InputPackages...');
        const packagesRef = collection(db, 'InputPackages');

        // Try with filter first
        const q = query(packagesRef, where('active', '==', true));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            console.log(`✅ Found ${querySnapshot.size} active packages`);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as InputPackage));
        }

        // Fallback: Fetch everything to see if it's a filter/index issue
        console.log('⚠️ No active packages found with filter. Trying fallback (all docs)...');
        const allSnapshot = await getDocs(packagesRef);
        console.log(`📡 Fallback found ${allSnapshot.size} total documents in InputPackages`);

        return allSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as InputPackage));

    } catch (error) {
        console.error('❌ Error fetching input packages:', error);
        return [];
    }
}

/**
 * Get a specific package by ID
 */
export async function getPackageDetails(packageId: string): Promise<InputPackage | null> {
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return null;
        }

        const packageRef = doc(db, 'InputPackages', packageId);
        const packageDoc = await getDoc(packageRef);

        if (packageDoc.exists()) {
            return {
                id: packageDoc.id,
                ...packageDoc.data()
            } as InputPackage;
        }
        return null;
    } catch (error) {
        console.error('Error fetching package details:', error);
        return null;
    }
}

/**
 * Get package by crop type (case-insensitive and robust)
 */
export async function getPackageByCropType(cropType: string): Promise<InputPackage | null> {
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return null;
        }

        console.log(`🔍 Searching for BNPL package for crop: ${cropType}`);
        const packagesRef = collection(db, 'InputPackages');

        // Try exact match first
        let q = query(
            packagesRef,
            where('cropType', '==', cropType),
            where('active', '==', true)
        );
        let querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            } as InputPackage;
        }

        // If not found, fetch all active and find case-insensitive
        const allPackages = await getInputPackages();
        const matched = allPackages.find(p =>
            p.cropType.toLowerCase() === cropType.toLowerCase()
        );

        if (matched) {
            console.log(`✅ Found case-insensitive match: ${matched.cropType}`);
            return matched;
        }

        console.warn(`❌ No active BNPL package found for crop type: ${cropType}`);
        console.log('Available packages:', allPackages.map(p => p.cropType).join(', '));

        return null;
    } catch (error) {
        console.error('Error fetching package by crop type:', error);
        return null;
    }
}

/**
 * Calculate total produce due based on package and acres
 */
export function calculateProduceDue(producePerAcre: number, acres: number): number {
    return producePerAcre * acres;
}

/**
 * Check if user has a mapped farm
 */
export async function checkUserHasFarm(userId: string): Promise<{ hasFarm: boolean; farmData?: any }> {
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return { hasFarm: false };
        }

        const assessmentsRef = collection(db, 'assessments');
        const q = query(assessmentsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Return the most recent assessment
            const farms = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as any));

            // Sort by createdAt descending
            farms.sort((a, b) => {
                const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return bTime - aTime;
            });

            return {
                hasFarm: true,
                farmData: farms[0]
            };
        }

        return { hasFarm: false };
    } catch (error) {
        console.error('Error checking user farm:', error);
        return { hasFarm: false };
    }
}

/**
 * Create a new farmer contract
 */
export async function createContract(
    userId: string,
    userEmail: string,
    packageId: string,
    farmData: any,
    expectedHarvestDate: string
): Promise<{ success: boolean; contractId?: string; error?: string }> {
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return { success: false, error: 'Database not initialized' };
        }

        const packageDetails = await getPackageDetails(packageId);

        if (!packageDetails) {
            return { success: false, error: 'Package not found' };
        }

        const totalAcres = farmData.area_hectares * 2.47105; // Convert hectares to acres
        const totalProduceDue = calculateProduceDue(packageDetails.produceRepaymentPerAcre, totalAcres);

        const contractData: Omit<FarmerContract, 'id'> = {
            userId: userId, // CHANGED: from farmerId to userId
            farmerEmail: userEmail,
            packageId: packageId,
            cropType: packageDetails.cropType,
            totalAcres: parseFloat(totalAcres.toFixed(2)),
            totalProduceDue: parseFloat(totalProduceDue.toFixed(1)),
            farmBoundary: farmData.fieldCoordinates || JSON.stringify(farmData.field_coordinates || []),
            fieldLocation: farmData.fieldLocation || farmData.field_location || 'Unknown',
            status: 'Active',
            termsAccepted: true,
            termsAcceptedAt: serverTimestamp(),
            signedAt: serverTimestamp(),
            expectedHarvestDate: expectedHarvestDate,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const contractsRef = collection(db, 'FarmerContracts');
        const docRef = await addDoc(contractsRef, contractData);

        return { success: true, contractId: docRef.id };
    } catch (error) {
        console.error('Error creating contract:', error);
        return { success: false, error: 'Failed to create contract' };
    }
}

/**
 * Get all contracts for a user
 */
export async function getUserContracts(userId: string): Promise<FarmerContract[]> {
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return [];
        }

        const contractsRef = collection(db, 'FarmerContracts');
        const q = query(contractsRef, where('userId', '==', userId)); // CHANGED: from farmerId to userId
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as FarmerContract));
    } catch (error) {
        console.error('Error fetching user contracts:', error);
        return [];
    }
}

/**
 * Get contract by ID
 */
export async function getContractById(contractId: string): Promise<FarmerContract | null> {
    try {
        if (!db) {
            console.error('Firestore not initialized');
            return null;
        }

        const contractRef = doc(db, 'FarmerContracts', contractId);
        const contractDoc = await getDoc(contractRef);

        if (contractDoc.exists()) {
            return {
                id: contractDoc.id,
                ...contractDoc.data()
            } as FarmerContract;
        }
        return null;
    } catch (error) {
        console.error('Error fetching contract:', error);
        return null;
    }
}
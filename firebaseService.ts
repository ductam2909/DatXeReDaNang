
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  addDoc
} from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { Driver, Passenger, UserProfile, TimeSlot } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyAaX0wpDjsh72wXXR1Zb6DIq4k-d5MywVE",
  authDomain: "demoapp-b868a.firebaseapp.com",
  databaseURL: "https://demoapp-b868a-default-rtdb.firebaseio.com",
  projectId: "demoapp-b868a",
  storageBucket: "demoapp-b868a.appspot.com",
  messagingSenderId: "787575797082",
  appId: "1:787575797082:web:f0d0cd1fd5ba4c10c6ef63",
  measurementId: "G-FWQPLZGCX6",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const DRIVERS_COLLECTION = "rideshare_drivers";
const PASSENGERS_COLLECTION = "rideshare_passengers";
const USERS_COLLECTION = "rideshare_users";
const TIMESLOTS_COLLECTION = "rideshare_time_slots";

/**
 * Hàm làm sạch dữ liệu đệ quy (Deep Sanitize)
 */
const sanitizeData = (data: any): any => {
  if (data === null || data === undefined) return null;
  const type = typeof data;
  if (type !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => sanitizeData(item));
  if (data instanceof Date) return data.getTime();
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value !== undefined && typeof value !== 'function') {
        sanitized[key] = sanitizeData(value);
      }
    }
  }
  return sanitized;
};

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

export const registerWithPhone = async (phone: string, pass: string, name: string) => {
  const email = phone.includes('@') ? phone : `${phone}@rideshare.pro`;
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;
  const profile: UserProfile = {
    uid: user.uid,
    name,
    phone,
    email: user.email || undefined,
    role: phone === 'admin' ? 'admin' : undefined,
    createdAt: Date.now()
  };
  await setDoc(doc(db, USERS_COLLECTION, user.uid), sanitizeData(profile));
  return profile;
};

export const loginWithPhone = (phone: string, pass: string) => {
  const email = phone.includes('@') ? phone : `${phone}@rideshare.pro`;
  return signInWithEmailAndPassword(auth, email, pass);
};

export const logout = () => signOut(auth);

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
  return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
};

export const saveUserProfile = async (profile: UserProfile) => {
  await setDoc(doc(db, USERS_COLLECTION, profile.uid), sanitizeData(profile), { merge: true });
};

export const listenToDrivers = (callback: (drivers: Driver[]) => void) => {
  return onSnapshot(collection(db, DRIVERS_COLLECTION), (snapshot) => {
    const drivers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Driver));
    callback(drivers);
  });
};

export const listenToPassengers = (callback: (passengers: Passenger[]) => void) => {
  return onSnapshot(collection(db, PASSENGERS_COLLECTION), (snapshot) => {
    const passengers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Passenger));
    callback(passengers);
  });
};

export const listenToUsers = (callback: (users: UserProfile[]) => void) => {
  return onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
    const users = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
    callback(users);
  });
};

export const listenToTimeSlots = (callback: (slots: TimeSlot[]) => void) => {
  return onSnapshot(collection(db, TIMESLOTS_COLLECTION), (snapshot) => {
    const slots = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TimeSlot));
    callback(slots.sort((a, b) => a.time.localeCompare(b.time)));
  });
};

export const addTimeSlot = async (time: string) => {
  await addDoc(collection(db, TIMESLOTS_COLLECTION), { time });
};

export const deleteTimeSlot = async (id: string) => {
  await deleteDoc(doc(db, TIMESLOTS_COLLECTION, id));
};

export const updateDriverState = async (driver: Driver) => {
  try {
    const driverRef = doc(db, DRIVERS_COLLECTION, driver.id);
    await setDoc(driverRef, sanitizeData(driver), { merge: true });
  } catch (error) {
    console.error("Error updating driver:", error);
  }
};

export const deleteDriver = async (driverId: string) => {
  try {
    await deleteDoc(doc(db, DRIVERS_COLLECTION, driverId));
  } catch (error) {
    console.error("Error deleting driver:", error);
  }
};

export const bookRide = async (passenger: Passenger) => {
  try {
    const passengerRef = doc(db, PASSENGERS_COLLECTION, passenger.id);
    await setDoc(passengerRef, sanitizeData({ ...passenger, status: 'pending' }));
    return passenger.id;
  } catch (error) {
    console.error("Error booking ride:", error);
    throw error;
  }
};

export const cancelRide = async (passengerId: string) => {
  try {
    await deleteDoc(doc(db, PASSENGERS_COLLECTION, passengerId));
  } catch (error) {
    console.error("Error cancelling ride:", error);
  }
};

export const updatePassengerStatus = async (passengerId: string, status: 'pending' | 'booked' | 'completed', driverId?: string) => {
  try {
    const passengerRef = doc(db, PASSENGERS_COLLECTION, passengerId);
    const updates: any = { status, driverId: driverId || null };
    if (status === 'completed') {
      updates.completedAt = Date.now();
    }
    await updateDoc(passengerRef, sanitizeData(updates));
  } catch (error) {
    console.error("Error updating passenger:", error);
  }
};

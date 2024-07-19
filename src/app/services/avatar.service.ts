import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { collection, collectionData, CollectionReference, doc, docData, DocumentData, endAt, Firestore, getDocs, DocumentChange, orderBy, query, setDoc, startAt, updateDoc, onSnapshot, deleteDoc, serverTimestamp, addDoc, limit, limitToLast } from '@angular/fire/firestore';
import {
  getDownloadURL,
  ref,
  Storage,
  uploadString,
} from '@angular/fire/storage';
import { Photo } from '@capacitor/camera';
import { distanceBetween, geohashForLocation, geohashQueryBounds} from 'geofire-common';
import { Observable } from 'rxjs';
import { Card } from '../interfaces/card';
import { Drivers } from '../interfaces/drivers';
import { Rider } from '../interfaces/rider';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  bookRide(data: any) {
    throw new Error('Method not implemented.');
  }
  
  private driverCollection: CollectionReference<DocumentData>;
  directory: any;
  userUID: string;
  userName: string;
  userEmail: string;
  profile: DocumentData;
  pathM: string;
  countryCode: any;
  user: import("@angular/fire/auth").User;

  constructor(
    private auth: Auth,
    public firestore: Firestore,
    private storage: Storage,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.auth.onAuthStateChanged((user)=>{
      if (user){
        this.user = user;
        this.driverCollection = collection(this.firestore, 'Drivers');
     
        this.http.get("http://ip-api.com/json").subscribe((res: any) => {
          
        console.log('res ', res);


        this.countryCode = res.countryCode || 'NG';
     
     })
  
    }
 
  })
  }

   getUserProfile(user) {
    const userDocRef = doc(this.firestore, `Riders/${user.uid}`);
     return docData(userDocRef);
  }


  //Request a ride with your details and remove the driver from list of available drivers to avoid another request from someone else
  async RequestRideWithRiderDetails(user_Loc_coord, des, loco, user_Des_coord, ID, price, cash){
    try{
      const loc: Rider = {
        Loc_lat: user_Loc_coord.lat,
        Loc_lng: user_Loc_coord.lng,
        Rider_id: this.user.uid,
        Rider_name: this.user.displayName,
        Rider_phone: this.user.phoneNumber,
        Rider_imgUrl: this.user.photoURL,
        Rider_rating: this.profile.Rider_rating,
        Des_lat: user_Des_coord.lat,
        Des_lng: user_Des_coord.lng,
        Rider_Location: loco,
        Rider_Destination: des,
        Rider_email: this.user.email,
        countDown: 20,
        cancel: false,
        price: price,
        cash: cash
      };
     
      const userDocRef = doc(this.firestore, 'Drivers', ID)
      await updateDoc(userDocRef, {onlineState: false,});
      console.log('deleted current driver ID');
      await setDoc(doc(this.firestore, "Request",  ID), { ...loc});
      console.log('Added New driver ID');
    }catch(e){
      throw new Error(e);
      
    }
  }

  async RestartRequestSinceReject(ID){
    const userDocRef = doc(this.firestore, 'Request', ID)
    await updateDoc(userDocRef, {cancel: false});
  }

//delete the driver that has a request sent to him.
  async deleDriverFromRequest(ID){
    await deleteDoc(doc(this.firestore, "Request", ID))
  }

  async cancelRide(ID){
    const userDocRef = doc(this.firestore, 'Request', ID)
    await updateDoc(userDocRef, {cancel: true});
  }

  //Push driver info into the request database
  async PushDriverToRequest(Driver){
    try{
    const loc: Drivers = {
      geohash: Driver.geohash,
      Driver_lat: Driver.Driver_lat,
      Driver_lng: Driver.Driver_lng,
      Driver_id: Driver.Driver_id,
      Driver_name: Driver.Driver_name,
      Driver_car: Driver.Driver_car,
      Driver_imgUrl: Driver.Driver_imgUrl,
      Driver_rating: Driver.Driver_rating,
      distance: 0,
      duration: 0,
      seats: Driver.seats,
      start: false,
      stop: Driver.stop,
      intransit: Driver.intransit,
      cancel: Driver.cancel,
      Driver_cartype: Driver.Driver_cartype,
      Driver_plate: Driver.Driver_plate,
      time: ''
    };
    await updateDoc(doc(this.firestore, "Request",  Driver.Driver_id), { ...loc});
  }catch(e){
    throw new Error(e);
    
  }
   
    console.log('done')
  }

  async getPriceEstimate(distance: number): Promise<number> {
    try {
      // Your pricing logic goes here
      // For example, a simple flat rate per kilometer
      const ratePerKm = 1.5; // Adjust this based on your pricing strategy
      const price = distance * ratePerKm;
      return price;
    } catch (error) {
      console.error('Error calculating price estimate:', error);
      throw error;
    }
  }


  async createHistory(Driver){
    try{
    const loc: Drivers = {
      geohash: Driver.geohash,
      Driver_lat: Driver.Driver_lat,
      Driver_lng: Driver.Driver_lng,
      Driver_id: Driver.Driver_id,
      Driver_name: Driver.Driver_name,
      Driver_car: Driver.Driver_car,
      Driver_imgUrl: Driver.Driver_imgUrl,
      Driver_rating: Driver.Driver_rating,
      distance: 0,
      duration: 0,
      seats: Driver.seats,
      start: true,
      stop: Driver.stop,
      intransit: Driver.intransit,
      cancel: Driver.cancel,
      Driver_cartype: Driver.Driver_cartype,
      Driver_plate: Driver.Driver_plate,
      time: serverTimestamp(),
    };
    await setDoc(doc(this.firestore, "Riders",  `${this.auth.currentUser.uid}/History/${Driver.Driver_id}`), { ...loc});
  }catch(e){
    throw new Error(e);
    
  }
   
    console.log('done')
  }


  async UpdateCountDown(time, Driver){
    try {
      const userDocRef = doc(this.firestore, "Request",  Driver.Driver_id)
      await updateDoc(userDocRef, {
        countDown: time,
      });
      return true;
    } catch (e) {
     // alert(e)
      console.log(e);
      return null;
    }
  }


  async AddKnownPlace(place){
    try {
      const userDocRef = doc(this.firestore, "Riders",  `${this.auth.currentUser.uid}/KnownPlaces/${place.full}`)
      await setDoc(userDocRef, {
        place,
      });
      return true;
    } catch (e) {
     // alert(e)
     console.log(e);
      return null;
    }
  }




  ///update driver information
  async CreateandUpdateDriver(coord, ID){
    try{
   
    const loc: Drivers = {
      geohash: geohashForLocation([coord.coords.latitude, coord.coords.longitude]),
      Driver_lat: coord.coords.latitude,
      Driver_lng: coord.coords.longitude,
      Driver_id: ID,
      Driver_name: 'james',
      Driver_car: 'Nissan',
      Driver_imgUrl: '',
      Driver_rating: 0,
      distance: 0,
      duration: 0,
      seats: 1,
      start: false,
      stop: false,
      intransit: false,
      cancel: false,
      Driver_cartype: '',
      Driver_plate: '',
      time: ''
    };
    await setDoc(doc(this.firestore, "Drivers",  ID), { ...loc});
  }catch(e){
    throw new Error(e);
    
  }
   
    console.log('done')
  }



  ///create a new driver and publish info to database
  async CreateNewDriver(coord){
    try{
    const loc: Drivers = {
      geohash: geohashForLocation([coord.coords.latitude, coord.coords.longitude]),
      Driver_lat: coord.coords.latitude,
      Driver_lng: coord.coords.longitude,
      Driver_id: 'Driver ' + Math.random(),
      Driver_name: 'james',
      Driver_car: 'Nissan',
      Driver_imgUrl: '',
      Driver_rating: 0,
      distance: 0,
      duration: 0,
      seats: 1,
      start: false,
      stop: false,
      intransit: false,
      cancel: false,
      Driver_cartype: '',
      Driver_plate: '',
      time: ''
    };
    await setDoc(doc(this.firestore, "Drivers",  'Driver '+ Math.random()), { ...loc});
  }catch(e){
    throw new Error(e);
  }
  }

  //geoquery, sort drivers within a specified radius and seperate them from the others
  async checkDriversWithin(center, radiusInM){
    try{
    const userDocRef = collection(this.firestore, `Drivers`);
// Each item in 'bounds' represents a startAt/endAt pair. We have to issue
// a separate query for each pair. There can be up to 9 pairs of bounds
// depending on overlap, but in most cases there are 4.
const bounds = geohashQueryBounds(center, radiusInM);
const promises = [];
for (const b of bounds) {
  const q = query(userDocRef, orderBy("geohash"), startAt(b[0]), endAt(b[1]));
  this.directory = q;
  const documentSnapshots = await getDocs(q);
  documentSnapshots.docChanges().forEach((doc) => {
    // alert(JSON.stringify(doc.doc));
    // doc.data() is never undefined for query doc snapshots
    console.log(doc.doc, " => ", doc.doc.data());
    promises.push(doc.doc.data());
  })
 
}



// Collect all the query results together into a single list
const j = await Promise.all(promises).then((snapshots) => {
  const matchingDocs = [];
  for (const snap of snapshots) {
     
      const lat = snap.Driver_lat;
      const lng = snap.Driver_lng;
      // We have to filter out a few false positives due to GeoHash
      // accuracy, but most will match
      const distanceInKm = distanceBetween([lat, lng], center);
      
    
      const distanceInM = distanceInKm * 1000;

      console.log(snap);
      snap.distance = distanceInM;
      snap.duration = this.time_convert(distanceInM)

      console.log(distanceInM, radiusInM);
      if (distanceInM <= radiusInM) {
        matchingDocs.push(snap);
      }
      
  }

  return matchingDocs;
})

   if (j)
   return j

    }catch(e){
      throw new Error(e);
    }

  }


   time_convert(num)
  { 
   var minutes = Math.floor(num / 60);  
   return minutes       
  }

     getDriver() {
      return collectionData(this.driverCollection, {
        idField: 'id',
      }) as Observable<Drivers[]>;
     }


    update(pokemon: Drivers) {
      const pokemonDocumentReference = doc(
        this.firestore,
        `pokemon/${pokemon.Driver_id}`
      );
      return updateDoc(pokemonDocumentReference, { ...pokemon });
    }
  

  async uploadImage(cameraFile: Photo, uid) {
   
    const storageRef = ref(this.storage, this.pathM);

    try {
      await uploadString(storageRef, cameraFile.base64String, 'base64');

      const imageUrl = await getDownloadURL(storageRef);

      const userDocRef = doc(this.firestore, `Riders/${uid}`);
      await setDoc(userDocRef, {
        imageUrl,
      });
      return true;
    } catch (e) {
      return null;
    }
  }
 

  async createUser(name, email, img, phone, uid) {
    try {
      const loc: Rider = {
        Loc_lat: 0,
        Loc_lng: 0,
        Rider_id: uid,
        Rider_name: name,
        Rider_phone: phone,
        Rider_imgUrl: img,
        Rider_rating: 0,
        Des_lat: 0,
        Des_lng: 0,
        Rider_Location: '',
        Rider_Destination: '',
        Rider_email: email,
        countDown: 0,
        cancel: false,
        price: 0,
        cash: true
      };
      await setDoc(doc(this.firestore, "Riders",  uid), { ...loc});
      return true;
    } catch (e) {
      return null;
    }
  }


   getMessage() {
    const userDocRef = collection(this.firestore, `Messages/${this.auth.currentUser.uid}/messages`);
    return collectionData(userDocRef);
  }

  getChatMessage(ID) {
    const userDocRef = collection(this.firestore, `Request/${ID}/messages`);
    return collectionData(userDocRef);
  }

  async addChatEnRouteMessage(msg, iD) {
    return await addDoc(collection(this.firestore, `Request/${iD}/messages`), {
      msg: msg,
      from: this.auth.currentUser.uid,
      createdAt: serverTimestamp(),
      myMsg: true,
      fromName: this.profile.Rider_name
    });
  }
  
  async updatChatMessageInfo(id){
    return await setDoc(doc(this.firestore, `Request/${id}/`),
    {
      name: this.profile.Rider_name,
      id: this.profile.Rider_id,
      phone: this.profile.Rider_phone,
      email: this.profile.Rider_email,
      new: true
    }
    )
  }
  

  getCards() {
    const userDocRef = collection(this.firestore, `Riders/${this.auth.currentUser.uid}/Cards`);
    return collectionData(userDocRef);
  }

  getKnownPlaces() {
    const userDocRef = collection(this.firestore, `Riders/${this.auth.currentUser.uid}/KnownPlaces`);
   
    return collectionData(userDocRef);
  }

  getAllBlogs() {
    const userDocRef = collection(this.firestore, `Blogs`);
   
    return collectionData(userDocRef);
  }


  getDrivers() {
    const userDocRef = collection(this.firestore, `Drivers`);
    return collectionData(userDocRef);
  }

async addChatMessage(msg) {
  return await addDoc(collection(this.firestore, `Messages/${this.profile.Rider_id}/messages`), {
    msg: msg,
    from: this.auth.currentUser.uid,
    createdAt: serverTimestamp(),
    myMsg: true,
    fromName: this.profile.Rider_name
  });
}

async updateMessageInfo(){
  return await setDoc(doc(this.firestore, `Messages/${this.profile.Rider_id}`),
  {
    name: this.profile.Rider_name,
    id: this.profile.Rider_id,
    phone: this.profile.Rider_phone,
    email: this.profile.Rider_email,
    new: true
  }
  )
}


async createCard(name, number, type, id) {
  try {
    const loc: Card = {
      name: name,
      number: number,
      type: type,
      id: id,
      selected: true
    };
    await setDoc(doc(this.firestore, "Riders",  `${this.profile.Rider_id}/Cards/${name}`), { ...loc});
    return true;
  } catch (e) {
   // alert(e)
    console.log(e);
    return null;
  }

  
}



async updateDriverOnlineState(ID) {
  try {
    const userDocRef = doc(this.firestore, 'Drivers', ID)
    await updateDoc(userDocRef, {
      onlineState: true,
    });
    return true;
  } catch (e) {
    //alert(e)
    console.log(e);
    return null;
  }
}


async updateCArd(name, number, type, id, state) {
  try {
    const loc: Card = {
      name: name,
      number: number,
      type: type,
      id: id,
      selected: state
    };
    await updateDoc(doc(this.firestore, "Riders",  `${this.profile.Rider_id}/Cards/${name}`), { ...loc});
    return true;
  } catch (e) {
   // alert(e)
    console.log(e);
    return null;
  }

}


}
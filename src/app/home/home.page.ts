import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { ModalOptions, ModalController, Platform, NavController } from '@ionic/angular';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import { OverlayService } from '../services/overlay.service';
import { GeocodeService } from '../services/geocode.service';
import { MapService } from '../services/map.service';
// import { Marker } from '@capacitor/google-maps';
import { AvatarService } from '../services/avatar.service';
import { Drivers } from '../interfaces/drivers';

import { Observable, timer, interval } from 'rxjs';
import { Firestore, onSnapshot, doc } from '@angular/fire/firestore';
import { Marker } from '@capacitor/google-maps';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';
import { EnrouteChatComponent } from '../enroute-chat/enroute-chat.component';

declare var google;


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  
  profile = null;
  @ViewChild('map') mapRef: ElementRef<HTMLElement>;
  mappy; 
  @ViewChild('mapElement') mapElement:  ElementRef<HTMLElement>;
  coordinates: Position;
  address: any = 'Unknown';
  bookingStage: any;
  confirmStage: any;
  trackingStage: any;
  searchingStage: any;
  noDriverStage: any;
  drivingToDestinationStage: any;
  data: any;
  cash: any = false;
  state: any = [];
  mapPinStage: boolean;
  D_LatLng: { lat: any; lng: any; };
  mapPinDrag: any;
  showResetLocationButton: any = false;
  showloader: boolean;
  mapClass: any;
  destinationAddress: string = 'Drag To Pick Destination';
  locationAddress: string = 'Loading...';
  distance: any;
  direction: any;
  actualDestination: any;
  markers: any;
  allDrivers: Observable<Drivers[]>;
  NoDrivers: boolean;
  driverMarker: string;
  driver_duration_apart: number;
  driver_number_of_seats: any;
  price: any = 0;
  carname: any;
  driver_ID: any;
  bounds: any;
  DriverLatLng: { lat: any; lng: any; };
  driver_marker: any;
  drivers_Requested: any[];
  current_Request_Number: number = -1;
  Driver_Rejected: any;
  numCalls: any;
  currentDriver: any;
  unsubscribe: import("@angular/fire/firestore").Unsubscribe;
  driverInfo: import("@angular/fire/firestore").DocumentData;
  
  duration: any;
  riderCleared: any;
  updateDriverSubcription: any;
  canCheck: boolean;
  rider_marker: any;
  marker1: any;
  marker2: any;
  actualLocation: string;
  LatLng: { lat: number; lng: number; };
  mapy: boolean;
  AllCarMarkers: Marker[];
  _carmarkers: any[];
  cards: import("@angular/fire/firestore").DocumentData[];
  selected: any;
  selectedCard: any;
  closeDrivers: any;
  countDown: any;
  listen: any;
  places: import("@angular/fire/firestore").DocumentData[];


  constructor( private authService: AuthService, private auth: Auth, public map: MapService, private nav: NavController, private platform: Platform, private firestore: Firestore, private readonly database: AvatarService, private ngZone: NgZone, private geocode: GeocodeService, private overlay: OverlayService, private modalCtrl: ModalController) {}


  //start the scene
  async ngOnInit() {
   try{
    this.EnterBookingStage();
    await Geolocation.checkPermissions();
    const coordinates = await Geolocation.getCurrentPosition();
    this.coordinates = coordinates;

   await this.map.createMap(this.mapRef.nativeElement, coordinates);
   this.mapy = true;

   this.database.getCards().subscribe((d)=>{
    console.log(d);
    this.cards = d

    this.cards.forEach(element => {
     console.log(element);
      if (element.selected == true){
       this.selected = element
       this.selectedCard = element.name;
       if (this.selectedCard == 'cash')
       this.cash = true;
       console.log(this.selectedCard);
      }
    });
})

this.database.getKnownPlaces().subscribe((d)=>{
  this.places = d.slice(0,3);
  this.places
  
console.log(d)
  
})
  
      this.actualLocation = this.map.actualLocation;
     this.locationAddress = this.map.locationAddress
              
             
    this.LatLng = {
      lat: coordinates.coords.latitude,
      lng: coordinates.coords.longitude
    }

            //this.database.CreateNewDriver(coordinates);

              this.map.newMap.setOnCameraIdleListener((g) => {
                this.ngZone.run(()=>{
                  this.showResetLocationButton = true;
                })
              })

              this.map.newMap.setOnCameraIdleListener(async (g) => {
                this.ngZone.run(async () => {
                  console.log(g);
                  if (this.mapPinStage) {
                    const addressResponse = await this.geocode.getAddress(g.latitude, g.longitude).toPromise();
                    
                    if (addressResponse) {
                      this.D_LatLng = {
                        lat: g.latitude,
                        lng: g.longitude,
                      };
                      this.actualDestination = this.map.actualLocation;
              
                      const results = addressResponse.results;
                      if (results && results.length > 1) {
                        const addressComponents = results[1].address_components;
                        if (addressComponents && addressComponents.length > 1) {
                          this.destinationAddress = `${addressComponents[0].long_name} ${addressComponents[1].long_name}`;
                          console.log("this is it " + this.destinationAddress);
                        } else {
                          console.log('Address components are missing or incomplete.');
                        }
                      } else {
                        console.log('Results are missing or incomplete.');
                      }
                    } else {
                      console.log('Failed to fetch address.');
                    }
                  }
                });
              });
              
             
              await this.map.newMap.enableCurrentLocation(true);
             
              this.price = null;


            }catch(e){
              this.overlay.showAlert('Error', e)
            }    
           
            await this.checkDriversAround(this.coordinates);

}

async logout() {
  await this.authService.logout();
}

ionViewDidLeave() {
  if(this.listen)
    this.listen.unsubscribe();
}

ionViewDidEnter(){
  if (this.coordinates)
  this.listen = interval(5000).subscribe(async ()=>{
    await this.checkDriversAround(this.coordinates);
  })

}


  async simulateDriverAPP(){
    let coords = {
      coords: {latitude: 51.5074, longitude: 0.1278},
    }
  }



/// Show all drivers around the user and reset marker states
  async checkDriversAround(cord){
    try{
      let numbs = [];
      
      const center = [cord.coords.latitude, cord.coords.longitude];
      const radiusInM = 500 * 1000;
      const drivers = await this.database.checkDriversWithin(center, radiusInM);
         //Start Listening for any changes within;
         this.current_Request_Number = 0
      console.log("Should show drivers here  "+drivers);
      if (drivers.length == 0){
        this.NoDrivers = true;
      }else{
        this.NoDrivers = false;
        console.log(drivers);
        this.drivers_Requested = [];
        this._carmarkers = [];
        drivers.forEach((element, key, arr) => {
          numbs.push(element.duration)
          const min = Math.min(...numbs)
          this.driver_duration_apart = min;
          if (element.duration <= 1000 && element.onlineState == true)
          {
              this.drivers_Requested.push(element);
              console.log(this.drivers_Requested);
              this.carname = this.drivers_Requested[0].Driver_car
              this.driver_ID = this.drivers_Requested[0].Driver_id
              this.driver_number_of_seats = this.drivers_Requested[0].seats
              
              this.DriverLatLng = {
                lat: this.drivers_Requested[0].Driver_lat,
                lng: this.drivers_Requested[0].Driver_lng,
              }

            //  alert(this.drivers_Requested[0]);
          }else{
            if (Object.is(arr.length - 1, key)) {
              this.NoDrivers = true;
             }
          }

          //alert(JSON.stringify(element));
          // console.log(min);
          // console.log(element);
          this.closeDrivers = element;
         
          
        });
      }

    }catch(e){
      this.overlay.showAlert('Error', e);
    }

  }



  async chooseCard(even){
    console.log(even);
     this.overlay.showLoader('Please wait..');
     await this.database.updateCArd(this.selected.name, this.selected.number, this.selected.type, this.selected.id, false)
    this.cards.forEach(async element => {
      console.log(element);
       if (element.name == even.detail.value){
      await this.database.updateCArd(element.name, element.number, element.type, element.id, true)
       this.overlay.hideLoader();
       }
       })
  }

async StartRide(){
  try{
  

  if (this.marker1){
  await this.map.newMap.removeMarker(this.marker1.toString());
  this.marker1 = null;
  console.log('removed ', this.marker1)
  }

  if (this.marker2){
  await this.map.newMap.removeMarker(this.marker2.toString());
  this.marker2 = null
  console.log('removed ', this.marker2)
  }

  if (this._carmarkers){
  this._carmarkers.forEach(async element => {
    console.log(element, this._carmarkers)
    await this.map.newMap.removeMarker(element);
    console.log('removed ', element)
    this._carmarkers = null;
  });
}

this.map.newMap.enableCurrentLocation(false);

  this.BookRide();
}catch(e){
   this.overlay.showAlert('MArker Error', e)
}
  
  
}

  async BookRide(){
     await this.overlay.showLoader('');

     if (this.driver_marker){
      await this.map.newMap.removeMarker(this.driver_marker);
      this.driver_marker = null;
      
      }
  
      if (this.rider_marker){
      await this.map.newMap.removeMarker(this.rider_marker);
      this.rider_marker = null;
     
      }
    let driver = this.drivers_Requested[this.current_Request_Number]

    const userDocRef = doc(this.firestore, `Request`, driver.Driver_id);

    const unsub = onSnapshot(doc(this.firestore, "Drivers", driver.Driver_id), async (doc) => {

     if (this.price && doc.data().onlineState == true){
        unsub();
        
        await this.database.RequestRideWithRiderDetails(this.LatLng, this.destinationAddress, this.locationAddress, this.D_LatLng, driver.Driver_id, this.price, this.cash);
        

      //alert(driver);
  //  if (driver != undefined){
      this.currentDriver = driver;

      console.log(driver);

        
          // doc.data() is never undefined for query doc snapshots
          
          console.log(doc.data()); 
          
        
    // Driver Things;
   
    
     this.DriverLatLng = {
      lat: this.drivers_Requested[this.current_Request_Number].Driver_lat,
      lng: this.drivers_Requested[this.current_Request_Number].Driver_lng,
    }

      await this.createAndMoveMarkersOnRealtime(this.DriverLatLng, false, false);
      this.overlay.hideLoader();
      this.EnterSearchingStage();

       



            //after some time check if the next element has a driver if no request from driver, then close request and start a new request.
            console.log('This is the driver '+ driver);



               this.startTimer(driver, 20);
           
              this.numCalls = timer(20000).subscribe(async ()=>{
               // await this.database.updateDriverOnlineState(driver.Driver_id)
                // await this.database.CreateandUpdateDriver(coords, driver.Driver_id)
                this.countDown.unsubscribe();
                ///if the the there is still a driver in the array then call him else cancel the request
                if (this.drivers_Requested[this.current_Request_Number+1] != null){
                 
                this.current_Request_Number++;
                console.log(driver);
                this.BookRide();
                this.unsubscribe();
                this.numCalls.unsubscribe();
                console.log('requested another driver' + this.current_Request_Number);
              }else{
                this.numCalls.unsubscribe();
                this.unsubscribe()
                this.GoHome();
                console.log('No more Drivers To Request' + this.current_Request_Number);
                  if (this.driver_marker){
                  await this.map.newMap.removeMarker(this.driver_marker.toString());
                  this.driver_marker = null;
                  }
              
                  if (this.rider_marker){
                  await this.map.newMap.removeMarker(this.rider_marker.toString());
                  this.rider_marker = null;
                  }
              }
              })


       


          
               this.unsubscribe = onSnapshot(userDocRef, async (doc) => {
           // console.log(snapshot);
            
                  //If the driver rejects the request then close request and start a new one     
                  if (doc.data().cancel == true){
                    this.countDown.unsubscribe();
                    this.numCalls.unsubscribe();
                    ///if the the there is still a driver in the array then call him else cancel the request
                    if (this.drivers_Requested[this.current_Request_Number+1].Driver_id){
                      this.current_Request_Number++;
                      this.BookRide();
                      this.unsubscribe();
                      console.log('requested another driver' + this.current_Request_Number);
                      }else{
                      this.unsubscribe();
                      this.GoHome();
                      console.log('No more Drivers To Request' + this.current_Request_Number);

                      if (this.driver_marker){
                        await this.map.newMap.removeMarker(this.driver_marker.toString());
                        this.driver_marker = null;
                        }
                    
                        if (this.rider_marker){
                        await this.map.newMap.removeMarker(this.rider_marker.toString());
                        this.rider_marker = null;
                        }
                      }

                    //  await this.database.RestartRequestSinceReject(this.drivers_Requested[this.current_Request_Number].id)
                    }

                  if (doc.data().start == true){
                    this.driverInfo = doc.data();
                   
                    if (this.canCheck) {
                      //show rider marker going to destination on realtime with updates;
                      this.canCheck = false;
                      this.clearPrevMarkers()
                    this.updateDriverSubcription = timer(4000).subscribe(async ()=>{
                         await this.createAndMoveMarkersOnRealtime(this.D_LatLng, true, true);
                         this.canCheck = true;
                     })
                    }
                    console.log(doc.data());
                    this.EnterDrivingToDestinationStage();

                    if (doc.data().cancel == true){
                      if (!this.riderCleared){
                      this.overlay.showAlert('Driver', 'Cancelled');
                      }else{
                        this.overlay.showAlert('You', 'Cancelled');
                      }

                      this.unsubscribe();
                      this.GoHome();
                    }
                  }


                  if (doc.data().stop == true){
                    this.unsubscribe();
                    //this.overlay.showAlert('Ride', 'Completed');
                    this.ClearRide();
                    await this.database.createHistory(doc.data());
                    if (this.countDown)
                    this.countDown.unsubscribe();
                  }
              


              
                 
                if (doc.data().Driver_name && doc.data().stop == false && doc.data().start == false && doc.data().cancel == false){
                  this.driverInfo = doc.data(); 
                  this.countDown.unsubscribe();
                  this.numCalls.unsubscribe();
                  this.DriverLatLng = {
                  lat: doc.data().Driver_lat,
                  lng: doc.data().Driver_lng,
                }
                if (this.canCheck) {
                  // show rider marker and driver marker coming together;
                  this.canCheck = false;
                  this.clearPrevMarkers();
                  this.updateDriverSubcription = timer(4000).subscribe(async ()=>{
                    this.canCheck = true;
                     await this.createAndMoveMarkersOnRealtime(this.DriverLatLng, true, false);
               })
                }
                
                console.log(doc.data());
                this.EnterTrackingStage();
              }
              
      
    
          });

          // timer(10000).subscribe(async ()=>{
          //   this.database.PushDriverToRequest(driver);
          //  })

            }else{
               if (this.countDown)
               this.countDown.unsubscribe();
                if (this.drivers_Requested[this.current_Request_Number+1] != null){
                this.current_Request_Number++;
                console.log(driver);
                this.BookRide();
                console.log('requested another driver' + this.current_Request_Number);
              }else{
                this.GoHome();
                this.overlay.showAlert('Busy', 'The Requested Driver is currently Busy, Please Try again');
                console.log('No more Drivers To Request' + this.current_Request_Number);
              }
            }

          // }else{
          //   this.NoDrivers = true;
          //   this.EnterNoDriverStage();
          // }

        })
  }


   async EnterChat(): Promise<void> 
  {
    const options: ModalOptions = {
      component: EnrouteChatComponent,
      componentProps: {
          userId: this.driverInfo.Driver_id,
          message: ""
      },
      swipeToClose: true,
  };

  const modal = await this.modalCtrl.create(options);
  return await modal.present();
  }


  startTimer(driver, sec) {
     this.countDown = interval(1000).subscribe(async ()=>{
        await this.database.UpdateCountDown(sec, driver)
        sec--;
        if(sec == 0)
        {
          this.countDown.unsubscribe();
        }
      })
 }



  async goBackTOAutocomplete(){

    if (this.marker1){
    await this.map.newMap.removeMarker(this.marker1);
    this.marker1 = null;
    }

    if (this.marker2){
    await this.map.newMap.removeMarker(this.marker2);
    this.marker2 = null;
    }

    if (this._carmarkers){
      this._carmarkers.forEach(async element => {
        console.log(element, this._carmarkers)
        await this.map.newMap.removeMarker(element);
        console.log('removed ', element);
      });
    }

    this.showAutocompleteModal();
  }


  //open the search section for autocomplete
  async showAutocompleteModal(): Promise<void> 
  {
    const options: ModalOptions = {
      component: AutocompleteComponent,
      componentProps: {
         LatLng: this.LatLng,
         locationAddress: this.locationAddress
      },
      swipeToClose: true,
    };

    // this.map.newMap.hide();

    

    
  
    const modal = await this.modalCtrl.create(options);
    modal.present();

    const { data } = await modal.onWillDismiss();
    console.log(data);
    // this.map.newMap.show();

    
    this.data = data;

    if (data.pinOnMap) {
      this.EnterMapPinStage();
      this.mapPinDrag = true;
    }

    if (data.home) {
      this.EnterBookingStage();
      await this.map.newMap.setCamera({
        animate: true,
        animationDuration: 500,
        zoom: 15,
        coordinate: this.LatLng
      })
    }

    if (data.searching) {
      this.database.AddKnownPlace(data);
      this.destinationAddress = data.full;
      this.actualDestination = data.whole.full;

      const latLng = await this.geocode.getLatLng(data.whole.description);
      this.D_LatLng =  {
        lat: latLng.data.results[0].geometry.location.lat,
        lng: latLng.data.results[0].geometry.location.lng,
      }
      this.getDistanceandDirections();
    }

  }

  async RequestRide(dat){
    if (!this.NoDrivers){
      this.destinationAddress = dat.place.full;
      this.actualDestination = dat.place.whole.full;

      const latLng = await this.geocode.getLatLng(dat.place.whole.description);
      this.D_LatLng =  {
        lat: latLng.data.results[0].geometry.location.lat,
        lng: latLng.data.results[0].geometry.location.lng,
      }
      this.getDistanceandDirections();
    }else{
      this.EnterNoDriverStage();
    }
  }


  //reset the map to the user location view
 async resetLocation(): Promise<void>{
  console.log(this.LatLng);
  await this.map.newMap.setCamera({
    animate: true,
    animationDuration: 500,
    zoom: 15,
    coordinate: this.LatLng
  });
  this.showResetLocationButton = false;
}
  
///get the distance and directions to destination
  async getDistanceandDirections()
  {

    if (this.listen)
    this.listen.unsubscribe();

    if (this.D_LatLng.lat){
    if (!this.NoDrivers){
      this.EnterConfirmStage();
    }else{
      this.EnterNoDriverStage();
    }
  
     var origin1 = new google.maps.LatLng(this.LatLng.lat, this.LatLng.lng);
     var origin2 = new google.maps.LatLng(this.D_LatLng.lat, this.D_LatLng.lng);

     if (!this.NoDrivers)
     var request = {
      origin: origin1,
      destination: origin2,
      travelMode: google.maps.TravelMode.DRIVING,
    };
          this.geocode.directions.route(request, async (response, status) => {

             if (status == 'OK')
             {
               this.direction = response;
               
               this.distance = response.routes[0].legs[0].distance.value;

               this.bounds = response.routes[0].bounds;

               this.price = this.distance/10;

               await this.UpdateCarMarker(this.closeDrivers);

               await this.createAndAddMarkers(this.LatLng, this.D_LatLng, this.bounds);
             }
             else
             {
              this.overlay.showAlert('Direction ERROR', JSON.stringify(response))
             }

          }) 
        }else{
          this.overlay.showAlert('Drag Map', 'Drag the map and stop on your required destination')
        }
  }

  //create and update car markers on the map.
  async UpdateCarMarker(element){
    let latlng = {
      lat: element.Driver_lat,
      lng: element.Driver_lng
    }
    
  const markers = await this.map.newMap.addMarker({ 
    coordinate: latlng,
    iconUrl: 'https://i.ibb.co/KDy365b/hatchback.png',
    title: 'My 2',
  })

  if (markers)
  this._carmarkers.push(markers.toString());
  console.log( this._carmarkers,  markers.toString());
   
  }

//Return to Map page
  async GoHome(){
    await this.map.newMap.enableCurrentLocation(true);
    this.current_Request_Number = 0
    this.price = null;
    this.listen = interval(5000).subscribe(async ()=>{
      await this.checkDriversAround(this.coordinates);
    })
    this.EnterBookingStage();
     await this.map.newMap.setCamera({
        animate: true,
        animationDuration: 500,
        zoom: 15,
        coordinate: this.LatLng
        
      })
  }

  async GotoSupport(){
    await this.nav.navigateForward('support');
   
    
  }

  async clearPrevMarkers(){
    if (this.driver_marker){
      await this.map.newMap.removeMarker(this.driver_marker.toString());
      this.driver_marker = null;
      }
  
      if (this.rider_marker){
      await this.map.newMap.removeMarker(this.rider_marker.toString());
      this.rider_marker = null;
      }
  }

  //Return to Map page
  async ReturnHome(){
    this.EnterBookingStage();
      await this.map.newMap.setCamera({
        animate: true,
        animationDuration: 500,
        zoom: 15,
        coordinate: this.LatLng
       
      })
  }

//Cancel the Current Ride Request.....
  async CancelRide(){
     
    this.overlay.showLoader('Please Wait..');
    
    if (this.driver_marker){
    await this.map.newMap.removeMarker(this.driver_marker.toString());
    this.driver_marker = null;
    }

    if (this.rider_marker){
    await this.map.newMap.removeMarker(this.rider_marker.toString());
    this.rider_marker = null;
    }

    

    let coords = {
      coords: {latitude: this.currentDriver.Driver_lat, longitude: this.currentDriver.Driver_lng},
    }
    this.unsubscribe();
    this.numCalls.unsubscribe();
    this.riderCleared = true;
    await this.database.cancelRide(this.currentDriver.Driver_id)
    await this.map.newMap.enableCurrentLocation(true);
    this.current_Request_Number = 0
    this.price = null;
    this.listen = interval(5000).subscribe(async ()=>{
      await this.checkDriversAround(this.coordinates);
    })
    this.EnterBookingStage();
    this.overlay.hideLoader();
      await this.map.newMap.setCamera({
        animate: true,
        animationDuration: 500,
        zoom: 15,
      coordinate: this.LatLng
      })
  }

///Clear the ride that has already started
  async ClearRide(){
    this.EnterBookingStage();
    if (this.driver_marker){
    await this.map.newMap.removeMarker(this.driver_marker);
    this.driver_marker = null;
    }
    if (this.rider_marker){
    await this.map.newMap.removeMarker(this.rider_marker);
    this.rider_marker = null;
    }

    await this.map.newMap.enableCurrentLocation(true);
    this.current_Request_Number = 0
    this.price = null;

    this.listen = interval(5000).subscribe(async ()=>{
      await this.checkDriversAround(this.coordinates);
    })
    await this.map.newMap.setCamera({
      animate: true,
      animationDuration: 500,
      zoom: 15,
      coordinate: this.LatLng,
      bearing: 0
    })
   
  }


  async CallDriver(){
      
  }


  ///create markers and possition them in the view of the user
  async createAndMoveMarkersOnRealtime(otherLatLng, state, isDestination){

var origin1 = new google.maps.LatLng(this.LatLng.lat, this.LatLng.lng);
var origin2 = new google.maps.LatLng(otherLatLng.lat, otherLatLng.lng);

var request = {
origin: origin2,
destination: origin1,
travelMode: google.maps.TravelMode.DRIVING,
};
    this.geocode.directions.route(request, async (response, status) => {
       if (status == 'OK')
       {
         this.bounds = response.routes[0].bounds;

         this.duration = response.routes[0].legs[0].duration.text;
  
   let markerUrl;
  if (!isDestination){
    markerUrl = 'https://i.ibb.co/KDy365b/hatchback.png'
  }else{
    markerUrl = 'https://i.ibb.co/bWx9V64/favourite.png'
  }

   this.driver_marker = await this.map.newMap.addMarker({
     coordinate: otherLatLng,
       iconUrl: markerUrl,
       title: 'My 2',
  });

  this.rider_marker = await this.map.newMap.addMarker({
    coordinate: this.LatLng,
     iconUrl: "https://i.ibb.co/N9LXGk3/home-1.png",
     title: 'My 2',
});


    const locs = [
     {
       geoCode: {
         latitude: this.LatLng.lat,
         longitude: this.LatLng.lng
       }
     },
     {
       geoCode: {
         latitude: otherLatLng.lat,
         longitude: otherLatLng.lng
       }
     }
   ];

   let go = {
     lat: (await this.map.CalculateCenter(locs)).latitude,
     lng: (await this.map.CalculateCenter(locs)).longitude
   }

   if (state){
    await this.map.newMap.setPadding({
      top: 0,
      left:0,
      right:0,
      bottom: 600
    })
   }
   

   let mapDim = {
     height: this.mapRef.nativeElement.offsetHeight/2,
     width: this.mapRef.nativeElement.offsetWidth
   }
     await this.map.newMap.setCamera({
       animate: true,
       animationDuration: 500,
       zoom: await this.map.getBoundsZoomLevel(this.bounds, mapDim),
       coordinate: go,
      bearing: 0
     })

     this.canCheck = true;

    }
    else
    {
     this.overlay.showAlert('Direction ERROR', JSON.stringify(response))
    }

 })
 
  }


  ///create markers and possition them in the view of the user
  async createAndAddMarkers(loc, des, bounds){

    this.marker1 = await this.map.newMap.addMarker({
      coordinate: loc,
       iconUrl: "https://i.ibb.co/N9LXGk3/home-1.png",
       title: 'My 2',
  });

  this.marker2 = await this.map.newMap.addMarker({
   coordinate: des,
     iconUrl: 'https://i.ibb.co/bWx9V64/favourite.png',
     title: 'My 2',
});



       const locs = [
        {
          geoCode: {
            latitude: loc.lat,
            longitude: loc.lng
          }
        },
        {
          geoCode: {
            latitude: des.lat,
            longitude: des.lng
          }
        }
      ];

       

      let go = {
        lat: (await this.map.CalculateCenter(locs)).latitude,
        lng: (await this.map.CalculateCenter(locs)).longitude
      }

      let mapDim = {
        height: this.mapRef.nativeElement.offsetHeight/2,
        width: this.mapRef.nativeElement.offsetWidth
      }
        await this.map.newMap.setCamera({
          animate: true,
          animationDuration: 500,
          zoom: await this.map.getBoundsZoomLevel(bounds, mapDim),
          coordinate: go,
          bearing: 0
        })
  }


  

  EnterBookingStage() 
  {
    this.bookingStage = true
    this.confirmStage = false;
    this.trackingStage = false;
    this.searchingStage = false;
    this.noDriverStage = false;
    this.mapPinStage = false;
    this.drivingToDestinationStage = false;
  }


  EnterMapPinStage() {
    this.bookingStage = false
    this.confirmStage = false;
    this.trackingStage = false;
    this.searchingStage = false;
    this.noDriverStage = false;
    this.mapPinStage = true;
    this.drivingToDestinationStage = false;
  }

  EnterConfirmStage() {
    this.bookingStage = false;
    this.confirmStage = true;
    this.trackingStage = false;
    this.searchingStage = false;
    this.noDriverStage = false;
    this.mapPinStage = false;
    this.drivingToDestinationStage = false;
  }

  EnterSearchingStage() {
    this.bookingStage = false;
    this.confirmStage = false;
    this.trackingStage = false;
    this.searchingStage = true;
    this.noDriverStage = false;
    this.mapPinStage = false;
    this.drivingToDestinationStage = false;
  }

  EnterNoDriverStage() {
    this.bookingStage = false;
    this.confirmStage = false;
    this.trackingStage = false;
    this.searchingStage = false;
    this.noDriverStage = true;
    this.mapPinStage = false;
    this.drivingToDestinationStage = false;
  }

  EnterTrackingStage() {
    this.bookingStage = false;
    this.confirmStage = false;
    this.trackingStage = true;
    this.searchingStage = false;
    this.noDriverStage = false;
    this.mapPinStage = false;
    this.drivingToDestinationStage = false;
  }

  EnterDrivingToDestinationStage() {
    this.bookingStage = false;
    this.confirmStage = false;
    this.trackingStage = false;
    this.searchingStage = false;
    this.mapPinStage = false;
    this.noDriverStage = false;
    this.drivingToDestinationStage = true;
  }






}

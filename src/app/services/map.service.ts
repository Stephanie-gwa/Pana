import { Injectable } from '@angular/core';
import { GoogleMap } from '@capacitor/google-maps';
import { environment } from 'src/environments/environment';
import { GeocodeService } from './geocode.service';
import { OverlayService } from './overlay.service';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  LatLng: { lat: any; lng: any; };
  locationAddress: string = 'Loading..';
  showResetLocationButton: boolean;
  mapPinStage: any;
  D_LatLng: { lat: any; lng: any; };
  actualLocation: any;
  exampleMapId: any;
  newMap: GoogleMap;

  constructor(private overlay: OverlayService, private geocode: GeocodeService, private http: HttpClient) {}

  async createMap(ref, coords) {
    try {
      this.newMap = await GoogleMap.create({
        id: 'my-cool-map',
        element: ref,
        apiKey: environment.apiKey,
        config: {
          center: {
            lat: 5.5122138,
            lng: 7.4919135
          },
          zoom: 8,
        },
      });

      this.LatLng = {
        lat: coords.coords.latitude,
        lng: coords.coords.longitude
      };

      this.newMap.enableTrafficLayer(true);
      this.newMap.enableCurrentLocation(true);
      await this.newMap.setCamera({
        animate: true,
        animationDuration: 500,
        zoom: 15,
        coordinate: this.LatLng
      });

      const address = await this.getAddress(this.LatLng.lat, this.LatLng.lng);
      
      // Log the address response for debugging
      console.log('Address response:', address);

      if (address && address.results) {
        if (address.results.length > 0) {
          this.actualLocation = address.results[0].formatted_address;
        } else {
          console.log('No results found in address data');
        }

        if (address.results.length > 1) {
          const components = address.results[1].address_components;
          if (components.length >= 2) {
            this.locationAddress = components[0].long_name + ' ' + components[1].long_name;
          } else {
            console.log('Not enough address components for the second result');
          }
        } else {
          console.log('Less than two results found in address data');
        }
      } else {
        console.log('Address data is undefined or does not contain results');
      }
    } catch (e) {
      console.log('Error creating map or getting address:', e);
    }
  }

  async CalculateCenter(locations) {
    let latitude = 0;
    let longitude = 0;

    for (const location of locations) {
      longitude += location.geoCode.longitude;
      latitude += location.geoCode.latitude;
    }
    latitude /= locations.length;
    longitude /= locations.length;
    return {
      latitude,
      longitude
    };
  }

  async getBoundsZoomLevel(bounds, mapDim) {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 21;

    function latRad(lat) {
      const sin = Math.sin(lat * Math.PI / 180);
      const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
      return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }

    function zoom(mapPx, worldPx, fraction) {
      return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const latFraction = (latRad(ne.lat()) - latRad(sw.lat())) / Math.PI;

    const lngDiff = ne.lng() - sw.lng();
    const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

    const latZoom = zoom(mapDim.height, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(mapDim.width, WORLD_DIM.width, lngFraction);

    return Math.min(latZoom, lngZoom, ZOOM_MAX);
  }

  async getDirections(from: string, to: string): Promise<any> {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from}&destination=${to}&key=${environment.apiKey}`;
      const response = await this.http.get(url).toPromise();
      return response;
    } catch (error) {
      console.error('Error in getting directions:', error);
      return null;
    }
  }

  private getAddress(lat: number, lng: number): Promise<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = new HttpParams()
      .set('latlng', `${lat},${lng}`)
      .set('key', environment.apiKey);

    return this.http.get(url, { params }).toPromise();
  }
}

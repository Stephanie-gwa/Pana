import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { AlertController, NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { AvatarService } from 'src/app/services/avatar.service';
import { OverlayService } from 'src/app/services/overlay.service';
import { PaystackPlugin } from '@bot101/capacitor-paystack-plugin';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
})
export class PaymentPage implements OnInit {
  @ViewChild('paymentform',{read:ElementRef}) stripeButton : ElementRef;
  cardpaymentForm: FormGroup;
  public data: any;
  info: any;
  approve: boolean;
  cards: any[];
  selectedCard: any;
  selected: any;
  skeletOns: {}[];
  cash: any = 'cash';

  // Card details for Paystack
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;

  constructor(
    public prof: AvatarService,
    public nav: NavController,
    private http: HttpClient,
    public alertCtrl: AlertController,
    private overlay: OverlayService,
    public formBuilder: FormBuilder,
    private paystack: PaystackPlugin // Inject PaystackPlugin
  ) {}

  ionViewDidEnter() {
    this.skeletOns = [{}, {}, {}, {}, {}];
    this.setupPaystack();
    this.prof.getCards().subscribe((d) => {
      console.log(d);
      this.cards = d;
      this.cards.forEach(element => {
        console.log(element);
        if (element.selected === true) {
          this.selected = element;
          this.selectedCard = element.name;
          console.log(this.selectedCard);
        }
      });
    });
  }

  async chooseCard(event) {
    console.log(event);
    this.overlay.showLoader('Please wait..');
    await this.prof.updateCArd(this.selected.name, this.selected.number, this.selected.type, this.selected.id, false);
    await this.prof.updateCArd(event.name, event.number, event.type, event.id, true);
    this.overlay.hideLoader();
  }

  async setupPaystack() {
    console.log(this.paystack);
    // Initialize Paystack
    const initializeOptions = {
      publicKey: 'pk_test_efb7b8fa7e77edd630931e1f818802ed7e72dfed', // Replace with your Paystack public key
      production: false, // Set to true for production environment
    };

    try {
      await this.paystack.initialize(initializeOptions);
      console.log('Paystack initialized');
    } catch (error) {
      console.error('Paystack initialization failed', error);
    }
  }

  async handlePaystackPayment(event) {
    event.preventDefault();
    this.approve = true;

    try {
      // Add customer card information
      await this.paystack.addCard({
        cardNumber: this.cardNumber,
        expiryMonth: this.expiryMonth,
        expiryYear: this.expiryYear,
        cvv: this.cvv
      });

      // Set the email to charge
      await this.paystack.setChargeEmail({ email: "email@address.com" });

      // Set the amount to charge the card (in kobo)
      await this.paystack.setChargeAmount({ amount: '1000000' }); // example amount: 1000000 (10,000 Naira)

      // Optionally add custom fields, metadata, and charge parameters
      await this.paystack.putChargeCustomFields({ customField1: "field1", customField2: "field2" });
      await this.paystack.putChargeMetadata({ metaData1: "meta1", metaData2: "meta2" });
      await this.paystack.addChargeParameters({ param1: "param1", param2: "param2" });

      // Charge the card
      const chargeResponse = await this.paystack.chargeCard();
      console.log(chargeResponse.reference);
      this.overlay.showToast('Payment successful! Reference: ' + chargeResponse.reference);
      this.approve = false;

      // Update the card list or handle post-payment logic
      await this.prof.updateCArd(this.selected.name, this.selected.number, this.selected.type, this.selected.id, false);
      await this.prof.createCard(this.cardNumber, this.cardNumber.slice(-4), "Paystack", chargeResponse.reference);
      this.ionViewDidEnter(); // Refresh card list

    } catch (error) {
      console.error('Payment failed', error);
      this.overlay.showAlert('Payment Error', error.message);
      this.approve = false;
    }
  }

  async showPaymentAlert(title, subtitle, canLeave) {
    const alert = await this.alertCtrl.create({
      header: title,
      subHeader: subtitle,
      buttons: [{
        text: 'Approve',
        role: 'cancel',
        handler: () => {
          if (canLeave) {
            this.nav.pop();
          }
        }
      }],
      backdropDismiss: false
    });
    alert.present();
  }

  ngOnInit() {}

}

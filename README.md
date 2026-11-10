## Application Details
|               |
| ------------- |
|**Generation Date and Time**<br>Tue Nov 10 2026 19:54:21 GMT+0000 (Coordinated Universal Time)|
|**App Generator**<br>SAP Fiori Application Generator|
|**App Generator Version**<br>1.34.0|
|**Generation Platform**<br>SAP Business Application Studio|
|**Template Used**<br>Basic V2|
|**Service Type**<br>SAP System (ABAP On-Premise)|
|**Service URL**<br>http://vhapzds4ci.sap.almutahida.com.iq:44300/sap/opu/odata/sap/ZSD_CHECK_DELIVERY_SRV|
|**Module Name**<br>zsd_deliverychk|
|**Application Title**<br>Delivery Final Check|
|**Namespace**<br>|
|**UI5 Theme**<br>sap_horizon|
|**UI5 Version**<br>1.114.0|
|**Enable TypeScript**<br>False|
|**Add Eslint configuration**<br>True, see https://www.npmjs.com/package/@sap-ux/eslint-plugin-fiori-tools#rules for the eslint rules.|

## zsd_deliverychk

An SAP Fiori application.

### Delivery checking

Search or scan a delivery number, select the result, then scan or enter item barcodes.
Each item scan sends a POST to `CheckItemsSet` with the selected `Vbeln` and the
unmodified QR text in `Barcode`, then reloads the delivery's items. Both entity
sets must support filtering by `Vbeln`. The local metadata reflects this expected
contract; replace it with the updated service metadata when available. The live
service must expose `Barcode` and allow creation of `CheckItemsSet` entries.
Camera scanning requires a supported scanner environment; manual input remains available.

### Starting the generated app

-   This app has been generated using the SAP Fiori tools - App Generator, as part of the SAP Fiori tools suite.  To launch the generated application, run the following from the generated application root folder:

```
    npm start
```

- It is also possible to run the application using mock data that reflects the OData Service URL supplied during application generation.  In order to run the application with Mock Data, run the following from the generated app root folder:

```
    npm run start-mock
```

#### Pre-requisites:

1. Active NodeJS LTS (Long Term Support) version and associated supported NPM version.  (See https://nodejs.org)


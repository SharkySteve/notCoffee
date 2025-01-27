/// <reference path="../.config/sa.d.ts"/>

import { PedType } from "../.config/enums.js";
import { setGirl, gfSex, saveVehicle } from "./coffee.js"

//showTextBox("badCoffee Loaded");

var player = new Player(0);

var motelMapBlip;

//flags
var pickedUpPassenger = false; // track if prostitute in car
var passenger = null;
var markerExists = null;

const idleMotelCoords = [2181.4930, -1770.7130, 13.0942];

//Main loop
while(true){
    wait(0);

    identifyPassenger(); // always identify passenger if player in car
}

// destroy motel marker if motelMapBlip assigned
function deleteMotelMarker() {
    if(motelMapBlip){
        motelMapBlip.remove();
        motelMapBlip = null;
        markerExists = false;
    }
}

// create motel marker
function motelMarker() {

    motelMapBlip = Blip.AddSpriteForContactPoint(idleMotelCoords[0], idleMotelCoords[1], idleMotelCoords[2], 21);
    markerExists = true;


    while (markerExists){
        wait(0);

        var playerVehicle = player.getChar().getCarIsUsing();
        if (!player.getChar().isInAnyCar() || playerVehicle.isPassengerSeatFree(0)) {
            pickedUpPassenger = false; 
            deleteMotelMarker();
            markerExists=false
            return;
        }

        if (player.getChar().locateStoppedInCar3D(idleMotelCoords[0], idleMotelCoords[1], idleMotelCoords[2], 1.5, 2.0, 2.0, true)) {
            let savedVehicle = player.getChar().storeCarIsInNoSave();

            saveVehicle(savedVehicle); // store vehicle player using for end of script            
            gfSex();
            log("gfSex complete");
            markerExists = false;
        }
    }
    deleteMotelMarker();
}

function identifyPassenger() {
    var playerVehicle = player.getChar().getCarIsUsing();

    if (!player.getChar().isInAnyCar() || playerVehicle.isPassengerSeatFree(0)) {
        pickedUpPassenger = false; 
        if(markerExists){
            deleteMotelMarker();
        }
        return;
    }

    if(player.getChar().isInAnyCar() && playerVehicle.getMaximumNumberOfPassengers() > 0){
        if(!playerVehicle.isPassengerSeatFree(0)){
            passenger = playerVehicle.getCharInPassengerSeat(0);

            if(!pickedUpPassenger){
                if(passenger.getPedType() == PedType.Prostitute){
        
                    setGirl(passenger.getModel()); // Assign girlModel in coffee.js

                    Text.PrintNow('HOMSG1', 2000, 3); // Girl instruction dialogue
                    
                    motelMarker(); // Create motel marker at Idlewood Motel
                }
                pickedUpPassenger = true;
            }
        }
    }
}

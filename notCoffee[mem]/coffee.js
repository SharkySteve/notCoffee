/// <reference path="../.config/sa.d.ts"/>

import { AudioStreamState, AudioStreamType, ChangeMoney, Fade, KeyCode, PedType, RadioChannel, SwitchType } from "../.config/enums.js";
import { Counter, Timer } from "./scm.ts";

var player = new Player(0);
var girl = null;

const girlModels = {
    BFYPRO: 63,
    HFYPRO: 64,
    SWFOPRO: 75,
    VWFYPRO: 85,
    WFYPRO: 152,
    VHFYPRO: 207,
    SHFYPRO: 237,
    SBFYPRO: 238,
    SFYPRO: 243,
    VBFYPRO: 245   
};

var storedPlayerVehicle = null;

var sexPosition = 0; // 0-2 during gameplay // 3 good ending // 4 bad ending
let cameraPos = 0;
var girlExcitement = 20;
var correctTiming = 0; // timing counter to play audio
const excitementDecreaseRate = 0.05; // adjust to amend ongoing excitement decrement

const idleMotelCoords = [2181.4930, -1770.7130, 13.0942]; // outside motel
var motelRoom = [447.75, 514.5, 1001.1];
var motelRoomArea = 12;

//for anim loops
var animTime = 0.0;
var reverseAnim = false; // if true 'rewind' anim

// to stop input spam
var lastKeyPressTime = 0;
const debounceDelay = 350;

//flags
var isPlaying = false;
var minigameInitComplete = false;
var sexStarted = false; // initial animation tracking
var isSexing = false; // trigger main loop while true
var isPositioning = false; //  true while player is changing position
var goodSex = false;
var badSex = false;
var isClimaxing = false;

export function gfSex() { // main
    isPlaying = true;
    let gameJustStarted = true;
    //main loop
    while (isPlaying) {
        wait(0);
        if (!Char.IsDead(player.getChar())) {
            if (gameJustStarted) { // run init if hasn't run
                initSexMinigame();
                gameJustStarted = false; // stop reinit of minigame unless gfsex recalled
            }

            // start minigame if initialisation complete
            if (minigameInitComplete) {
                isSexing = true;
                sexMinigame();
            }
        }
        else {
            isPlaying = false;
        }
    }
}

function sexMinigame(){

    while (isSexing){

        if (Pad.IsKeyPressed(KeyCode.Return)){
            isSexing = false;
        }// include exit loop if RETURN held here

        if (girlExcitement >= 100){
            //Text.PrintString('OMG I AM CUMIN AND NOT DA SPICE EITHER !', 2000);
            isClimaxing = true;
            goodSex = true;
            moan();
            sexPosition = 3;
        } else if(girlExcitement <= 0){
            //Text.PrintString('U CUM QUICK DADDY ..!', 2000);
            isClimaxing = true;
            badSex = true;
            moan();
            sexPosition = 4;
        }
        
        updateHUD();
        thrustTiming();
        changeCamera();
        animLoop();
        handlePositionChange();

        wait(0);
    }

    updateHUD();
    exit();
}

function exit(){
    log("Exiting minigame...");
    cleanUp();// exit minigame;
}

function cleanUp() {
    let maxHP = player.getChar().getMaxHealth();

    log("Starting cleanup...");

    minigameInitComplete = false;

    log("fading out...");
    Camera.DoFade(1500, Fade.Out);
    while (Camera.GetFadingStatus()) {
        wait(0);
    }

    Text.ClearHelp();
    log("cleared help text...");

    // Reset flags and variables
    sexStarted = false; // initial animation tracking
    isSexing = false; // trigger main loop while true
    isPositioning = false; //  true while player is changing position
    isClimaxing = false;
    sexPosition = 0;
    cameraPos = 0;
    girlExcitement = 20;
    animTime = 0.0;
    reverseAnim = false;
    log("reset flags and vars");

    // Remove minigame parameters
    player.getChar().setCollision(true);
    player.setControl(true);
    Hud.Display(true);
    Hud.DisplayRadar(true);
    Game.SetEveryoneIgnorePlayer(player, false);
    Game.SetAllCarsCanBeDamaged(true);
    Game.SetMinigameInProgress(false);
    log("minigame params reset");

    // Clear player tasks
    player.getChar().clearTasksImmediately();
    log("player tasks reset");

    // Delete girl
    if (girl) {
        girl.delete();
        girl = null;
        log("girl deleted");
    }

    // Load main world, motel area, and collision
    log("setting area visibility");
    Streaming.SetAreaVisible(0);
    player.getChar().setAreaVisible(0);
    Streaming.LoadScene(idleMotelCoords[0], idleMotelCoords[1], idleMotelCoords[2]);
    Streaming.RequestCollision(idleMotelCoords[0], idleMotelCoords[1]);
    log("loaded main map and collisions");

    // Teleport player back to motel with car
    if (!Car.IsDead(storedPlayerVehicle)) {
        log("teleporting player back to motel with car...");
        storedPlayerVehicle.setCoordinates(idleMotelCoords[0], idleMotelCoords[1], idleMotelCoords[2]);
        player.getChar().warpIntoCar(storedPlayerVehicle);
        log("teleporting back with car");
        storedPlayerVehicle.setProofs(false, false, false, false, false);
        storedPlayerVehicle.markAsNoLongerNeeded();
        storedPlayerVehicle = null;
    } else {
        log("storedPlayerVehicle is null or undefined");

    }

    // Set camera position back behind player
    log("restoring cam pos...");
    Camera.RestoreJumpcut();
    Camera.DoFade(2000, Fade.In);
    log("cam pos restored and fade in complete");

    if(goodSex == true){
        Stat.IncrementInt(24, 5); // increment max hp
        player.getChar().setHealth(maxHP);
        Text.PrintString('You gave her such a good time, this one was on the house!', 2000);
        goodSex = false;
    }
    if(badSex == true){
        player.addScore(-600); // player has to pay
        player.getChar().setHealth(maxHP);
        Text.PrintString('Shameful. Go take a shower.', 2000);
        badSex = false;
    }
    
    isPlaying = false;

    log("Minigame cleanup complete.");
}

function changeCamera(){
    let currentTime = Date.now();

    if (Pad.IsKeyPressed(KeyCode.LeftControl) && currentTime - lastKeyPressTime > debounceDelay) {
        if (cameraPos < 2) {
            cameraPos += 1;
        }
        else {
            cameraPos = 0;
        }
        lastKeyPressTime = currentTime;
    }

    switch(cameraPos){
        case 0:
            Camera.SetFixedPosition(446.920166, 516.614319, 1002.090515, 0.0, 0.0, 0.0);
            Camera.PointAtPoint(447.353271, 515.734375, 1001.895386, SwitchType.JumpCut);
            break;

        case 1:
            Camera.SetFixedPosition(446.778229, 514.179565, 1002.390564, 0.0, 0.0, 0.0);
            Camera.PointAtPoint(447.350220, 514.885803, 1001.973389, SwitchType.JumpCut);
            break;

        case 2:
            Camera.SetFixedPosition(447.745605, 514.630737, 1003.572083, 0.0, 0.0, 0.0);
            Camera.PointAtPoint(447.742310, 514.946899, 1002.623413, SwitchType.JumpCut);
            break;
    }
}

function updateHUD(){

    Game.SetMinigameInProgress(true);
    Text.PrintHelpForever('SXHELP');

    excitementBar();
}

function animLoop(){
    let sexAnimSpeed = 0.02 + (girlExcitement / 100) * 0.03; // adjust animTime "speed" based on excitement
    const maxSpeed = 0.75; 
    const minSpeed = 0.02; 

    sexAnimSpeed = Math.min(maxSpeed, Math.max(minSpeed, sexAnimSpeed)); // cap possible sex Anim Speeds

    ['SEX_1_P', 'SEX_2_P', 'SEX_3_P'].forEach((anim, index) => {
        const girlAnim = `SEX_${index + 1}_W`;
        if (player.getChar().isPlayingAnim(anim)) {
            if (animTime >= 0.99) {
                animTime = 0.98;
                reverseAnim = true;
            }

            if (animTime <= 0.01) {
                animTime = 0.01;
                reverseAnim = false;
            }

            if (reverseAnim) {
                animTime -= sexAnimSpeed;
            } else {
                animTime += sexAnimSpeed;
            }

            animTime = Math.max(0.0, Math.min(0.99, animTime));

            player.getChar().setAnimPlayingFlag(anim, false);
            player.getChar().setAnimCurrentTime(anim, animTime);
            girl.setAnimPlayingFlag(girlAnim, false);
            girl.setAnimCurrentTime(girlAnim, animTime);
        }
    });
}

function thrustTiming() {
    let currentTime = Date.now();

    if (currentTime - lastKeyPressTime > debounceDelay) {
        if (Pad.IsKeyPressed(KeyCode.Up) && animTime >= 0.70 && animTime <= 0.99) {
            girlExcitement += 5;
            correctTiming++;
            //log('Correct timing: Up key pressed');
            lastKeyPressTime = currentTime;
        } else if (Pad.IsKeyPressed(KeyCode.Down) && animTime <= 0.25 && animTime >= 0.01) {
            girlExcitement += 5; 
            correctTiming++;
            //log('Correct timing: Down key pressed');
            lastKeyPressTime = currentTime;
        } else if (Pad.IsKeyPressed(KeyCode.Up) || Pad.IsKeyPressed(KeyCode.Down)) {
            girlExcitement -= 2; 
            //log('Incorrect timing');
            lastKeyPressTime = currentTime;
        }
    }

    if(correctTiming == 7){
        log(`correct timing: ${correctTiming}`);
        moan();
        correctTiming = 0;
    }

    // Ensure girlExcitement stays within bounds
    girlExcitement = Math.max(0, Math.min(100, girlExcitement));
}

function handlePositionChange(){
    let currentTime = Date.now();

    if(sexPosition != 3 && sexPosition != 4){
        if (Pad.IsKeyPressed(KeyCode.LeftShift) && currentTime - lastKeyPressTime > debounceDelay) {
            if (sexPosition < 2) {
                sexPosition += 1;
                //log(`sex position = ${sexPosition}`);
            }
            else {
                sexPosition = 0;
                //log(`sex position = ${sexPosition}`);
            }
            lastKeyPressTime = currentTime;
            isPositioning = true;
        }
    }
    

    // handle positions
    switch (sexPosition) {
        case 0:
            if (isPositioning) {
                //log('Changing to position 0');
                changePosition('SEX_3to1_P', 'SEX_1_P', 'SEX_3to1_W', 'SEX_1_W');
            }
            break;

        case 1:
            if (isPositioning) {
                //log('Changing to position 1');
                changePosition('SEX_1to2_P', 'SEX_2_P', 'SEX_1to2_W', 'SEX_2_W');
            }
            break;

        case 2:
            if (isPositioning) {
                //log('Changing to position 2');
                changePosition('SEX_2to3_P', 'SEX_3_P', 'SEX_2to3_W', 'SEX_3_W');
            }
            break;

        case 3:
            if (player.getChar().isPlayingAnim('SEX_3_P')) {
                log('playing sex 3 transit');
                Task.PlayAnimNonInterruptable(player.getChar(), 'SEX_3to1_P', 'SEX', 4.0, false, false, false, false, 0);
                Task.PlayAnimNonInterruptable(girl, 'SEX_3to1_W', 'SEX', 4.0, false, false, false, false, 0);
                wait(1000);
            }

            Task.PlayAnimNonInterruptable(player.getChar(), 'SEX_1_Cum_P', 'SEX', 4.0, true, false, false, false, false, 0);
            Task.PlayAnimNonInterruptable(girl, 'SEX_1_Cum_W', 'SEX', 4.0, true, false, false, false, false, 0);
            
            wait(3000);
            isSexing = false;
            break;

        case 4:
            if (player.getChar().isPlayingAnim('SEX_1_P')) {
                Task.PlayAnimNonInterruptable(player.getChar(), 'SEX_1_Fail_P', 'SEX', 4.0, true, false, false, false, 0);
                Task.PlayAnimNonInterruptable(girl, 'SEX_1_Fail_W', 'SEX', 4.0, true, false, false, false, 0);
            }
            else if (player.getChar().isPlayingAnim('SEX_2_P')) {
                Task.PlayAnimNonInterruptable(player.getChar(), 'SEX_2_Fail_P', 'SEX', 4.0, true, false, false, false, 0);
                Task.PlayAnimNonInterruptable(girl, 'SEX_2_Fail_W', 'SEX', 4.0, true, false, false, false, 0);
            }
            else if (player.getChar().isPlayingAnim('SEX_3_P')) {
                Task.PlayAnimNonInterruptable(player.getChar(), 'SEX_3_Fail_P', 'SEX', 4.0, true, false, false, false, 0);
                Task.PlayAnimNonInterruptable(girl, 'SEX_3_Fail_W', 'SEX', 4.0, true, false, false, false, 0);
            }

            wait(2800);
            isSexing = false;
            break;
    }
}


function changePosition(mTransitionAnim, mSexAnim, fTransitionAnim, fSexAnim) {
    let transitionTime;

    // set transit anims if not already playing
    if (!player.getChar().isPlayingAnim(mTransitionAnim)) {
        //log(`Playing transition animations: ${mTransitionAnim}, ${fTransitionAnim}`);
        Task.PlayAnimNonInterruptable(player.getChar(), mTransitionAnim, 'SEX', 4.0, false, false, false, false, 0);
        Task.PlayAnimNonInterruptable(girl, fTransitionAnim, 'SEX', 4.0, false, false, false, false, 0);
    }

    // is transition anim playing
    if (player.getChar().isPlayingAnim(mTransitionAnim)) {
        transitionTime = player.getChar().getAnimCurrentTime(mTransitionAnim);
        //log(`Current animation time for ${mTransitionAnim}: ${transitionTime}`); // Debugging log

        // set main anim if transition anim complete
        if (transitionTime >= 1.0) {
            //log(`Switching to main animations: ${mSexAnim}, ${fSexAnim}`);
            Task.PlayAnimNonInterruptable(player.getChar(), mSexAnim, 'SEX', 4.0, true, false, false, false, 0);
            Task.PlayAnimNonInterruptable(girl, fSexAnim, 'SEX', 4.0, true, false, false, false, 0);
            isPositioning = false; // Transition complete
        }
    }
}

function startingPosition(mSexAnim, fSexAnim){
    if(!sexStarted){
        Task.PlayAnimNonInterruptable(player.getChar(), mSexAnim, 'SEX', 4.0, true, false, false, false, 0);
        Task.PlayAnimNonInterruptable(girl, fSexAnim, 'SEX', 4.0, true, false, false, false, 0);

        player.getChar().hideWeaponForScriptedCutscene(true);
        girl.hideWeaponForScriptedCutscene(true);

        sexStarted = true;
    }
}

function initSexMinigame(){ // Initialize minigame
    let animsLoaded;

    // fade to black
    Camera.DoFade(1500, Fade.Out);
    while (Camera.GetFadingStatus()){
        wait(0);
    }

    if(storedPlayerVehicle){
        storedPlayerVehicle.markAsNeeded();
    }

    // Set minigame parameters
    player.setControl(false);
    Hud.Display(false);
    Hud.DisplayRadar(false);
    Game.SetEveryoneIgnorePlayer(player, true);
    Game.SetAllCarsCanBeDamaged(false);

    // Set minigame stage
    player.getChar().clearTasksImmediately();
    girl.clearTasksImmediately();


    player.getChar().setCollision(false);
    girl.setCollision(false);

    player.getChar().setCoordinates(motelRoom[0], motelRoom[1], motelRoom[2]);
    player.getChar().setHeading(0);

    // Set position of girl
    let playerPosOffset = player.getChar().getOffsetInWorldCoords(0.0, 1.0, -1.0);
    let playerHeading = player.getChar().getHeading();
    let girlHeading = (playerHeading += 180.0);
    girl.setCoordinates(playerPosOffset.x, playerPosOffset.y, playerPosOffset.z);
    girl.setHeading(girlHeading);

    Streaming.SetAreaVisible(motelRoomArea);
    player.getChar().setAreaVisible(12);
    girl.setAreaVisible(12);
    
    // Load area and collision
    Streaming.LoadScene(447.7833, 514.9804, 1002.0820);
    Streaming.RequestCollision(447.7833, 514.9804)

    // set camera position 1
    Camera.SetFixedPosition(446.920166, 516.614319, 1002.090515, 0.0, 0.0, 0.0);
    Camera.PointAtPoint(447.353271, 515.734375, 1001.895386, SwitchType.JumpCut); // Cam position 1

    // load animation set
    if (!animsLoaded) {
        //log('loading anim group SEX');
        Streaming.RequestAnimation('SEX');

        while (!Streaming.HasAnimationLoaded('SEX')) {
            wait(0);
        }
        //log('loading anim set complete');
        animsLoaded = true;
    }

    // load initial anims
    if (animsLoaded) {
        if (!sexStarted) {
            startingPosition('SEX_1_P', 'SEX_1_W');
        }
    }
   
    Camera.DoFade(2000, Fade.In);

    minigameInitComplete = true;
}

const playAudio = async (folderName, fileName) => {
    const moans = AudioStream.Load(`/../CLEO/notCoffee[mem]/audio/${folderName}/${fileName}.mp3`); // edit path if audio folder changes
    moans.setState(AudioStreamState.Playing);
  
    while (moans.isPlaying()) {
      await asyncWait(0);
    }
  
    moans.remove();
  };
  function moan() {
    const moanMap = {
        [girlModels.BFYPRO]: { folderName: 'BFYPRO', moans: ['P63_1', 'P63_2', 'P63_3', 'P63_4'] },
        [girlModels.HFYPRO]: { folderName: 'HFYPRO', moans: ['P64_1', 'P64_2', 'P64_3'] },
        [girlModels.SWFOPRO]: { folderName: 'SWFOPRO', moans: ['P75_0', 'P75_1', 'P75_2'] },
        [girlModels.VWFYPRO]: { folderName: 'VWFYPRO', moans: ['P85_0', 'P85_1', 'P85_2'] },
        [girlModels.WFYPRO]: { folderName: 'WFYPRO', moans: ['P152_0', 'P152_1', 'P152_2'] },
        [girlModels.VHFYPRO]: { folderName: 'VHFYPRO', moans: ['P207_0', 'P207_1', 'P207_2'] },
        [girlModels.SHFYPRO]: { folderName: 'SHFYPRO', moans: ['P237_0', 'P237_1', 'P237_2'] },
        [girlModels.SBFYPRO]: { folderName: 'SBFYPRO', moans: ['P238_0', 'P238_1', 'P238_2'] },
        [girlModels.SFYPRO]: { folderName: 'SFYPRO', moans: ['P243_0', 'P243_1', 'P243_2'] },
        [girlModels.VBFYPRO]: { folderName: 'VBFYPRO', moans: ['P245_0', 'P245_1', 'P245_2'] }
    };

    let fileName = '';

    // Check if the model exists in moanMap
    if (moanMap.hasOwnProperty(girl.getModel())) {
        const { folderName, moans } = moanMap[girl.getModel()];

        if (isClimaxing) {
            if (goodSex) {
                fileName = moans[0].split('_')[0] + '_Cum';
                playAudio(folderName, fileName);
            } else {
                fileName = moans[0].split('_')[0] + '_Fail';
                playAudio(folderName, fileName);
            }
        } else if(girlExcitement > 20 && girlExcitement < 80) {
            let randomIndex = Math.floor(Math.random() * moans.length);
            fileName = moans[randomIndex];
            playAudio(folderName, fileName);
        }

        return;
    } else {
        log("Unknown model:", girl.getModel());
    }
}

function excitementBar() {   
    const excitementCounter = new Counter(0).type(1).key('SXHUD1').display();
    
    excitementCounter.value += girlExcitement;   

    if (girlExcitement >= 25){
        girlExcitement -= excitementDecreaseRate;
    } else{
        girlExcitement -= 0.025;
    }
    girlExcitement = Math.max(0, girlExcitement);

    if(!isSexing){
        excitementCounter.clear();
    }
}

export function saveVehicle(playerVehicle){
    storedPlayerVehicle = playerVehicle;
    storedPlayerVehicle.setProofs(true, true, true, true, true);

    log(`player vehicle: ${storedPlayerVehicle}`);
}

export function setGirl(femalePassenger){ // Create Char based on passenger model type
    let girlModel = femalePassenger;

    girl = Char.Create(PedType.Prostitute, girlModel, 0, 0 ,0);
}
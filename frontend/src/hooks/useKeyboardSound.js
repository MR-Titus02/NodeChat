const keyStrokeSounds = [
    new Audio("Sounds/keystore1.mp3"),
    new Audio("Sounds/keystore2.mp3"),
    new Audio("Sounds/keystore3.mp3"),
    new Audio("Sounds/keystore4.mp3"),
];

function useKeyboardSound() {
   const playRandomKeyStrokeSound = () => {
    const randomSound = keyStrokeSounds [Math.floor(Math.random() * keyStrokeSounds.length)];

    randomSound.currentTime = 0; //better user experience
    randomSound.play().catch(error => {console.log("Audio play failed:", error)})
    }
    return { playRandomKeyStrokeSound }
}

export default useKeyboardSound
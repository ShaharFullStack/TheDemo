# Audio Samples for HandSynth

This folder contains real instrument audio samples for the HandSynth application.

## Folder Structure

- `piano/` - Piano samples (C3-C6 range)
- `guitar/` - Acoustic and electric guitar samples
- `violin/` - Violin samples (G3-E7 range)
- `flute/` - Flute samples (C4-C7 range)
- `saxophone/` - Saxophone samples (Bb3-F#6 range)
- `cello/` - Cello samples (C2-C6 range)

## Sample Format

All samples should be in WAV or MP3 format, named according to their musical note:
- Format: `[Note][Octave].wav` or `[Note][Octave].mp3`
- Examples: `C4.wav`, `Db4.wav`, `E5.mp3`

## Sources

You can obtain high-quality instrument samples from:
1. **Free Sources:**
   - Freesound.org
   - Samples.kb6.de (University of Iowa Electronic Music Studios)
   - Philharmonia Orchestra samples
   
2. **Commercial Sources:**
   - Native Instruments Kontakt libraries
   - Spitfire Audio
   - EastWest libraries

## Notes

- Samples will be loaded dynamically and pitched shifted as needed
- Each instrument should have at least one sample per octave
- Higher quality samples (24-bit, 48kHz) are recommended
- Keep file sizes reasonable for web loading
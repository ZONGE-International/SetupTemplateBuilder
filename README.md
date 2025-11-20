# ZEN Template Builder

A browser-based interactive tool for creating Zonge acquisition templates visually.  
No installation required — works entirely in HTML/JavaScript.

This tool allows you to define electric dipoles (Ex/Ey), magnetic channels (Hx/Hy/Hz), and transmitter (Tx) channels with intuitive controls and a real-time layout preview. You can then export the full template or load an existing one.

## Features
- Visual channel editor (1–16 channels)
- Z+ direction handling (Up/Down)
- Real-time layout preview
- Offset inputs auto-enabled depending on CMP type
- Import .stt templates
- Export .stt templates
- Fully offline, single-file tool

## Usage
1. Open index.html in your browser.
2. Set template name.
3. Select number of channels.
4. Select CMP and offsets.
5. Export or copy to clipboard.
6. Load templates via the Load button.

## Output
Produces valid Zonge TYPE-2 templates inside `<TEMPLATE></TEMPLATE>` blocks.


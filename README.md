# 🌴 Three.js Advanced Nature Scene

A stunning, interactive 3D nature visualization built with Three.js featuring procedural terrain generation, dynamic lighting, tropical vegetation, particle effects, and real-time control panel.

![Three.js](https://img.shields.io/badge/Three.js-r128-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 🌍 Terrain & Environment
- **Procedural Terrain Generation** - Perlin-like noise-based landscape
- **Animated Water System** - Wave effects with transparency
- **Dynamic Sky Shader** - Realistic day/night gradient transitions
- **Atmospheric Fog** - Toggleable depth fog effect
- **Dense Grass Coverage** - 3000+ grass blades for realistic ground

### 🌳 Tropical Vegetation
- **L-System Procedural Trees** - Realistic branching patterns (5-50 trees)
- **Dense Tropical Plants** - Layered foliage with color variation
- **Colorful Flowers** - 8+ color varieties with petals and centers
- **High-Density Foliage** - Jungle-like atmosphere

### ☀️ Lighting & Time System
- **24-Hour Day/Night Cycle** - Complete time progression
- **Dynamic Sun Positioning** - Sun follows time of day
- **Adaptive Lighting** - Ambient and directional light adjust with time
- **Time Presets** - Quick preset buttons (Dawn/Day/Dusk/Night)
- **Hemisphere Lighting** - Realistic light bouncing from sky and ground
- **Configurable Shadow Quality** - Low/Medium/High shadow map sizes

### 💫 Particle & Effects
- **Dynamic Particle System** - Adjustable particle density (0-3x)
- **Wind Simulation** - Particles affected by wind forces
- **Particle Wrapping** - Natural particle recycling
- **Foliage Animation** - Wind-influenced tree and plant movement

### 🎮 Interactive Control Panel (Press H)
Real-time adjustable parameters:
- ⏰ Time of Day (0-24 hours)
- ☀️ Sun Intensity (0-2)
- 💡 Ambient Light (0-1)
- 🎨 Shadow Quality (Low/Medium/High)
- 🌲 Tree Density (5-50)
- 🌸 Flower Count (10-100)
- 🏔️ Terrain Height (20-100)
- 💨 Wind Speed (0-3)
- ✨ Particle Density (0-3)
- 🌊 Water & 🌫️ Fog Toggles

### 📊 Live Statistics
- FPS Counter
- Object Count & Mesh Count
- Camera Position
- Current Time Display
- Sun Intensity Monitoring

## 🎮 Controls

| Key/Action | Function |
|-----------|----------|
| **H** | Toggle Control Panel |
| **R** | Regenerate Scene |
| **Space** | Toggle Animation |
| **Drag Mouse** | Rotate Camera |
| **Scroll** | Zoom In/Out |

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Safari)
- No dependencies or installation needed!

### Running Locally

```bash
# Clone the repository
git clone https://github.com/ubergeekinterativa/three-nature-scene.git
cd three-nature-scene

# Start a local server (Python 3)
python -m http.server 8000

# Open http://localhost:8000 in your browser
```

### Alternative Methods

**Using Node.js:**
```bash
npx http-server
```

**Using PHP:**
```bash
php -S localhost:8000
```

## 📁 Project Structure

```
three-nature-scene/
├── index.html       # Main HTML file with UI
├── scene.js         # Three.js scene and logic
├── README.md        # This file
└── .gitignore       # Git ignore rules
```

## 🛠️ Technologies Used

- **Three.js** - 3D graphics library
- **WebGL** - GPU-accelerated graphics
- **Vanilla JavaScript** - No frameworks
- **HTML5 Canvas** - Rendering surface
- **CSS3** - Styling and animations

## 📖 How It Works

### Terrain Generation
Procedural terrain is generated using multiple sine waves at different frequencies to simulate Perlin noise. The terrain is rendered as a high-resolution plane with vertex displacement.

### L-System Trees
Trees are generated using Lindenmayer Systems (L-Systems) - a formal grammar that recursively generates realistic tree structures with branches.

### Dynamic Lighting
The sun's position, intensity, and color are calculated based on the time of day, creating realistic sunrise, midday, sunset, and night effects.

### Particle System
Particles float through the scene with wind-influenced movement. When they leave the bounds, they wrap around to the other side, creating continuous motion.

### Water Effects
Water is animated using a vertex shader that applies sine wave patterns for realistic wave animation with transparency.

## 🎨 Customization

### Change Terrain Size
Edit in `scene.js`:
```javascript
settings.terrainSize = 400; // Default: 300
```

### Adjust Colors
```javascript
// Tree trunk color
color: 0x654321, // Hex color code

// Leaf color variation
color: new THREE.Color().setHSL(0.35, 0.8, 0.4)
```

### Modify Vegetation Density
Use the Control Panel (Press H) or edit:
```javascript
settings.treeDensity = 25; // Default: 15
settings.flowerCount = 60; // Default: 40
```

## 🔧 Advanced Settings

Edit `settings` object in `scene.js`:

```javascript
const settings = {
    dayTime: 12,              // Current time (0-24)
    sunIntensity: 0.8,        // Sun brightness
    ambientIntensity: 0.6,    // Ambient light level
    treeDensity: 15,          // Number of trees
    flowerCount: 40,          // Number of flowers
    terrainHeight: 50,        // Terrain variation
    windSpeed: 1,             // Wind effect intensity
    particleDensity: 1,       // Particle count multiplier
    terrainSize: 300,         // Terrain size in units
    waterLevel: 5             // Water height
};
```

## 🐛 Troubleshooting

### Scene runs slowly
- Reduce terrain height
- Lower tree density and flower count
- Reduce particle density
- Set shadow quality to "Low"

### Trees not visible
- Check tree density setting
- Ensure camera is positioned correctly
- Verify terrain generation completed

### Water not showing
- Enable water via Control Panel (H key)
- Check `showWater` setting

## 📝 Browser Compatibility

| Browser | Support |
|---------|----------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Edge | ✅ Full |
| Safari | ✅ Full |
| IE 11 | ❌ No |

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 👤 Author

**ubergeekinterativa**
- GitHub: [@ubergeekinterativa](https://github.com/ubergeekinterativa)

## 📚 References

- [Three.js Documentation](https://threejs.org/docs/)
- [WebGL Specification](https://www.khronos.org/webgl/)
- [Lindenmayer Systems](https://en.wikipedia.org/wiki/L-system)
- [Perlin Noise](https://en.wikipedia.org/wiki/Perlin_noise)

## 🚀 Future Enhancements

- [ ] Export scene to glTF format
- [ ] Add more tree species
- [ ] Implement realistic weather (rain, snow)
- [ ] Add animal animations
- [ ] Performance optimization for mobile
- [ ] VR support
- [ ] Audio effects
- [ ] Seasonal variations

---

**Made with ❤️ using Three.js**
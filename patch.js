const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Insert LandingPage import
code = code.replace("import { WelcomeModal } from './components/WelcomeModal';", "import { WelcomeModal } from './components/WelcomeModal';\nimport { LandingPage } from './components/LandingPage';");

// Insert showLandingPage state
code = code.replace("const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);", "const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);\n  const [showLandingPage, setShowLandingPage] = useState<boolean>(true);");

// Update auth state listener to clear showLandingPage
code = code.replace(/setShowWelcomeModal\(false\);/g, "setShowWelcomeModal(false);\n        setShowLandingPage(false);");

// Wrap the main app return in a condition
code = code.replace("  return (\n    <div className=\"min-h-screen bg-[#f8f9fa]", "  if (showLandingPage) {\n    return (\n      <>\n        <LandingPage onStart={() => setShowLandingPage(false)} />\n        <WelcomeModal\n          isOpen={showWelcomeModal && !showLandingPage}\n          onComplete={(nickname, provider) => {\n            // ...\n          }}\n        />\n      </>\n    );\n  }\n\n  return (\n    <div className=\"min-h-screen bg-[#f8f9fa]");

fs.writeFileSync('src/App.tsx', code);

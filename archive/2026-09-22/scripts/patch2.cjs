const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const badCode = `  if (showLandingPage) {
    return (
      <>
        <LandingPage onStart={() => setShowLandingPage(false)} />
        <WelcomeModal
          isOpen={showWelcomeModal && !showLandingPage}
          onComplete={(nickname, provider) => {
            /* App.tsx doesn't use onComplete here currently, it passes it down in the JSX below but wait, it doesn't even pass onComplete normally? Let's not pass it if not needed */
          }}
        />
      </>
    );
  }`;

const goodCode = `  if (showLandingPage) {
    return <LandingPage onStart={() => setShowLandingPage(false)} />;
  }`;

code = code.replace(badCode, goodCode);

fs.writeFileSync('src/App.tsx', code);

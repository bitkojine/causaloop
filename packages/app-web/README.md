# @causaloop/app-web

The reference application for the Causaloop ecosystem. This package demonstrates how to build and organize a complex, side-effect heavy application using the Model-View-Update (MVU) pattern.

## ✨ Feature Showcases

### 1. Async Search

Demonstrates complex `Fetch` effect handling, including race condition prevention, loading states, and error recovery.

### 2. Worker-Powered Computation

Offloads intensive prime number calculation to the `@causaloop/platform-browser` worker pool, keeping the UI responsive.

### 3. High-Frequency Timer & Animation

Uses `Timer` and `AnimationFrame` effects to drive smooth, predictable UI state changes.

### 4. DevTools & Replay

Integration with the core replay system. Allows recording a session, exporting the JSON log, and replaying it to verify deterministic behavior.

## 🧪 E2E & Resilience

This app serves as the target for our comprehensive Playwright suite:

- **Standard Flows**: Happy path testing for all features.
- **Chaos Mode**: Adversarial user simulations (monkey testing) to verify the app doesn't crash under rapid-fire interactions.

## 🛠️ Structure

The app follows a strict feature-based structure for scalability:

- `features/`: Isolated modules containing their own Model, Msg, Update, and View.
- `app.ts`: The root integrator that dispatches messages to child features.

## ⚖️ License

MIT

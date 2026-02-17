# @causaloop/app-web

The reference application for the Causaloop ecosystem. This package demonstrates how to build and organize a complex, side-effect heavy application using the Model-View-Update (MVU) pattern with declarative subscriptions.

## ✨ Feature Showcases

### 1. Async Search (Effects)

Demonstrates `Fetch` effect handling, including race condition prevention, stale response rejection, loading states, and error recovery.

### 2. Data Loading (Effects)

Shows `Fetch` with `AbortController` cancellation and large response handling.

### 3. Worker Computation (Effects)

Offloads intensive prime number calculation to the `@causaloop/platform-browser` worker pool with timeout protection (30s) and manual reset capability.

### 4. Timer (Subscriptions)

Declarative `TimerSubscription` that ticks every second. The runtime starts/stops the interval based on the model's `isRunning` flag. Survives session restore automatically.

### 5. Animation (Subscriptions)

Declarative `AnimationFrameSubscription` driving a rotating box. The runtime manages the `requestAnimationFrame` loop based on the model's `isRunning` flag. Survives session restore automatically.

### 6. Stress Test (Subscriptions)

High-frequency `AnimationFrameSubscription` that shuffles 200 elements per frame. Demonstrates subscription-based continuous rendering under load.

### 7. DevTools & Replay

Integration with the core replay system. Allows recording a session, exporting the JSON log, and replaying it to verify deterministic behavior.

## 🧪 E2E & Resilience

This app serves as the target for our comprehensive Playwright suite:

- **Standard Flows**: Happy path testing for all features.
- **Chaos Mode**: Adversarial user simulations (monkey testing) to verify the app doesn't crash under rapid-fire interactions.
- **Session Restore**: Verifies subscriptions resume correctly after state restoration.

## 🛠️ Structure

The app follows a strict feature-based structure for scalability:

- `features/`: Isolated modules containing their own Model, Msg, Update, View, and Subscriptions.
- `app.ts`: The root integrator that dispatches messages to child features and aggregates subscriptions via `appSubscriptions()`.
- `main.ts`: Wires the dispatcher, subscription runner, and session restore with state normalization.

## ⚖️ License

MIT

import { Route, Switch } from "wouter";
import Index from "./pages/index";
import { Provider } from "./components/provider";
import { Pwa } from "./components/pwa";

function App() {
  return (
    <Provider>
      <Pwa />
      <Switch>
        <Route path="/" component={Index} />
      </Switch>
    </Provider>
  );
}

export default App;

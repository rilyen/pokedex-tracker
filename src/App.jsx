import { Routes, Route } from 'react-router-dom';
import Auth from './Auth';
import './App.css'
import Pokedex from './Pokedex';
import './Pokedex.css'

// main app with router
function App() {

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Auth />} />
        {/* navigation from handleAuth */}
        <Route 
          path="/trainer/:username/:region?/:collectionType?" 
          element={<Pokedex />}
        />
      </Routes>
    </div>
  )
}

export default App

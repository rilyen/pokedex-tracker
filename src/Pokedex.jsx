import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Pokedex.css'

// regions
const REGIONS = {
    kanto: { name: 'Kanto', start: 1, end: 151 },
    johto: { name: 'Johto', start: 152, end: 251 },
    hoenn: { name: 'Hoenn', start: 252, end: 386 },
    sinnoh: { name: 'Sinnoh', start: 387, end: 493 },
    unova: { name: 'Unova', start: 494, end: 649 },
    kalos: { name: 'Kalos', start: 650, end: 721 },
    alola: { name: 'Alola', start: 722, end: 809 },
    galar: { name: 'Galar', start: 810, end: 905 },
    paldea: { name: 'Paldea', start: 906, end: 1025 },
}

// pokemon sub-categories
const COLLECTION_TYPES = {
    regular: { name: 'Regular', field: 'is_regular' },
    shiny: { name: 'Shiny', field: 'is_shiny' },
    lucky: { name: 'Lucky', field: 'is_lucky' },
    xxl: { name: 'XXL', field: 'is_xxl' },
    xxs: { name: 'XXS', field: 'is_xxs'},
    hundo: { name: '100%', field: 'is_hundo' },
}

// Pokedex Component
function Pokedex() {
    const { username, region = 'kanto', collectionType = 'regular' } = useParams()  //extract from URL
    const navigate = useNavigate()
    const [pokemon, setPokemon] = useState([])
    const [loading, setLoading] = useState(true)
    const [caughtPokemon, setCaughtPokemon] = useState({})
    const [currentUser, setCurrentUser] = useState(null)
    const [profileUserId, setProfileUserId] = useState(null)

    const regionConfig = REGIONS[region]
    const typeConfig = COLLECTION_TYPES[collectionType]

    // get current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data: {user} }) => {
            setCurrentUser(user)
        })
    }, [])

    // identify the profile id from the username
    useEffect(() => {
        const getProfileUser = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .single()

            if (error || !data) {
                alert('User not found')
                navigate('/')
                return
            }
            setProfileUserId(data.id)
        }
        getProfileUser()
    }, [username, navigate])

    // Fetch PokeAPI Data
    useEffect(() => {
        const fetchPokemon = async() => {
            if (!regionConfig) return
            setLoading(true)
            try {
                const response = await fetch(
                    `https://pokeapi.co/api/v2/pokemon?limit=${regionConfig.end - regionConfig.start + 1}&offset=${regionConfig.start - 1}`
                )
                const data = await response.json()
                setPokemon(data.results.map((p, i) => ({
                    id: regionConfig.start + i,
                    name: p.name,
                })))
            } catch (error) {
                console.error('Error fetching Pokémon:', error)
                setLoading(false)
            } finally {
                setLoading(false)
            }
        }
        fetchPokemon()
    }, [region])

    // Load caught Pokemon data from Supabase
    useEffect(() => {
        if (!profileUserId) return
        const loadCaught = async () => {
            const { data } = await supabase
                .from('caught_pokemon')
                .select('*')
                .eq('user_id', profileUserId)

            const map = {}
            data?.forEach(item => map[item.pokemon_id] = item)
            setCaughtPokemon(map)
        }
        loadCaught()
    }, [profileUserId])

    // Toggle
    const toggleCaught = async (pokemonId) => {
        if (!currentUser || currentUser.id !== profileUserId) return

        const existing = caughtPokemon[pokemonId]
        const field = typeConfig.field
        
        const isCaught = existing ? !existing[field] : true

        // Update the database
        // if it doesn't exist yet, insert it
        if (!existing) {
            const { data, error } = await supabase
                .from('caught_pokemon')
                .insert({
                    user_id: currentUser.id,
                    pokemon_id: pokemonId,
                    [field]: true
                })
                .select().single()
            // Update the state locally
            if (!error) setCaughtPokemon(prev => ({ ...prev, [pokemonId]: data }))
        } else {
            // if it does exists, update and check if we need to delete it
            const { data: updatedData, error: updateError } = await supabase
                .from('caught_pokemon')
                .update({ [field]: isCaught })
                .eq('user_id', currentUser.id)
                .eq('pokemon_id', pokemonId)
                .select().single()

            if (!updateError && updatedData) {
                // check if every category is false
                const shouldDelete = 
                    !updatedData.is_regular &&
                    !updatedData.is_shiny &&
                    !updatedData.is_lucky &&
                    !updatedData.is_xxl &&
                    !updatedData.is_xxs &&
                    !updatedData.is_hundo;

                if (shouldDelete) {
                    const { error: deleteError } = await supabase
                        .from('caught_pokemon')
                        .delete()
                        .eq('id', updatedData.id)
                    
                    if (!deleteError) {
                        setCaughtPokemon(prev => {
                            const newState = { ...prev }
                            delete newState[pokemonId]
                            return newState
                        })
                    }
                } else {
                    setCaughtPokemon(prev => ({ ...prev, [pokemonId]: updatedData }))
                }
            }
        }
    }

    if (loading) return <div className="loading">Loading...</div>

    return (
        <div className="pokedex-container">
            <header className="pokedex-header"> 
                <h1>{username}'s {regionConfig.name} Pokédex</h1>
                <button className="signout-btn" onClick={() => { supabase.auth.signOut(); navigate('/') }}>
                    Sign Out
                </button>
            </header>

            {/* Region Tabs: Kanto, Johto, Hoenn, etc. */}
            <nav className="tabs">
                {Object.keys(REGIONS).map(r => (
                    <Link 
                        key={r} 
                        to={`/trainer/${username}/${r}/${collectionType}`} 
                        className={`tab ${region === r ? 'active' : ''}`}
                    >
                        {REGIONS[r].name}
                    </Link>
                ))}
            </nav>

            {/* Collection Type Tabs: Regular, Shiny, etc. */}
            <nav className="tabs">
                {Object.keys(COLLECTION_TYPES).map(t => (
                    <Link
                        key={t}
                        to={`/trainer/${username}/${region}/${t}`}
                        className={`tab ${collectionType === t ? 'type-active' : ''}`}
                    >
                        {COLLECTION_TYPES[t].name}
                    </Link>
                ))}
            </nav>

            {/* Pokedex Grid */}
            <div className="pokemon-grid">
                {pokemon.map(p => {
                    const caughtData = caughtPokemon[p.id]
                    const isCaught = caughtData ? caughtData[typeConfig.field] : false
                    
                    const sprite = collectionType === 'shiny'
                        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${p.id}.png`
                        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`
                    
                    return (
                        <div 
                            key={p.id} 
                            className={`pokemon-card ${isCaught ? 'caught' : 'not-caught'}`} 
                            onClick={() => toggleCaught(p.id)}
                        >
                            <span className="dex-id">#{String(p.id).padStart(3, '0')}</span>
                            
                            {/* Only show sprite if isCaught */}
                            <div className="sprite-container">
                                {isCaught ? (
                                    <img src={sprite} alt={p.name} className="pokemon-sprite" />
                                ) : (
                                    <div className="mystery-pokemon"></div>
                                )}
                            </div>
                            <p className="pokemon-name">{p.name}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default Pokedex

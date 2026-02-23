import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient';
import './Auth.css'

// Authenticator Component
function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false) // true for signup, false for login
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    // wait for Supabase
    e.preventDefault()
    setLoading(true)

    try {
      // Sign up path
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username }  // for the trigger
          }
        });

        if (error) throw error

        if (data.user) {
          alert('Account created! You can now sign in.');
          setIsSignUp(false); // Switch to Sign in form
        }
      } else {
        // Sign in path
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // fetch the username from the 'profiles' table in supbase using the User ID
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) throw profileError; 
          
        if (profile) {
          navigate(`/trainer/${profile.username}/kanto/regular`);
        }
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
        <form className="auth-form" onSubmit={handleAuth}>

            <h1>{isSignUp ? 'Create Trainer Account' : 'Welcome Back'}</h1>

            {/* Username Input. This renders if the user has clicked "Sign Up" */}
            {isSignUp && (
                <input
                    type="text"
                    placeholder="Trainer Name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
            )}

            {/* Email Input */}
            <input
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
            />

            {/* Password Input */}
            <input
                type="password" 
                placeholder="Pasword" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />

            <button type="submit" disabled={loading}>
                {loading ? 'Loading...': (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>

            {/* Toggle between Sign in and Sign up */}
            <p onClick={() => setIsSignUp(!isSignUp)} style={{ cursor: 'pointer' }}>
                {isSignUp ? 'Already a trainer? Sign In' : 'New here? Create an account'}
            </p>
        </form>
    </div>
  );
}

export default Auth;
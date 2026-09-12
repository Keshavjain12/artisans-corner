import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import authService from '../services/authService.js';
import { getStoredToken, setStoredToken } from '../services/api.js';

const initialState = {
  user: null,
  store: null,
  token: getStoredToken(),
  status: getStoredToken() ? 'loading' : 'idle',
  error: null,
};

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const res = await authService.login(payload);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const res = await authService.register(payload);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const fetchCurrentUser = createAsyncThunk(
  'auth/me',
  async (_arg, { rejectWithValue }) => {
    try {
      const res = await authService.me();
      return res.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
  { condition: () => Boolean(getStoredToken()) }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authService.logout();
  } catch {
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired(state) {
      state.user = null;
      state.store = null;
      state.token = null;
      state.status = 'idle';
    },
    setStore(state, action) {
      state.store = action.payload;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    const authenticate = (state, action) => {
      state.user = action.payload.user;
      state.store = action.payload.store;
      state.token = action.payload.token || state.token;
      state.status = 'authenticated';
      state.error = null;
      if (action.payload.token) setStoredToken(action.payload.token);
    };

    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, authenticate)
      .addCase(login.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, authenticate)
      .addCase(register.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCurrentUser.fulfilled, authenticate)
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.store = null;
        state.token = null;
        state.status = 'idle';
        setStoredToken(null);
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.store = null;
        state.token = null;
        state.status = 'idle';
        setStoredToken(null);
      });
  },
});

export const { sessionExpired, setStore, setUser } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsVendor = (state) =>
  ['vendor', 'admin'].includes(state.auth.user?.role) && Boolean(state.auth.store);
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';

export default authSlice.reducer;

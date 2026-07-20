import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { request } from './api';
export const uploadResume = createAsyncThunk('workspace/upload', async (file) => { const data = new FormData(); data.append('resume', file); return request({ method: 'post', url: '/resumes/upload', data }); });
export const analyzeJob = createAsyncThunk('workspace/job', async (payload) => request({ method: 'post', url: '/jobs/analyze', data: payload }));
export const matchResume = createAsyncThunk('workspace/match', async ({ resumeId, jobId }) => request({ method: 'post', url: `/resumes/${resumeId}/match`, data: { jobId } }));
export const rewriteResume = createAsyncThunk('workspace/rewrite', async ({ resumeId, jobId }) => request({ method: 'post', url: `/resumes/${resumeId}/rewrite`, data: { jobId } }));
const workspace = createSlice({ name: 'workspace', initialState: { resume: null, job: null, analysis: null, rewrite: null, status: 'idle', error: null, accepted: {} }, reducers: { setResume(state, action) { state.resume = action.payload; }, resolveChange(state, action) { state.accepted[action.payload.id] = action.payload.accept; } }, extraReducers: builder => builder
  .addCase(uploadResume.fulfilled, (s, a) => { s.status = 'ready'; s.resume = a.payload.resume; })
  .addCase(analyzeJob.fulfilled, (s, a) => { s.status = 'ready'; s.job = a.payload.job; })
  .addCase(matchResume.fulfilled, (s, a) => { s.status = 'ready'; s.resume = a.payload.resume; s.analysis = a.payload.analysis; })
  .addCase(rewriteResume.fulfilled, (s, a) => { s.status = 'ready'; s.resume = a.payload.resume; s.rewrite = a.payload; })
  .addMatcher(a => a.type.endsWith('/pending'), s => { s.status = 'loading'; s.error = null; })
  .addMatcher(a => a.type.endsWith('/rejected'), (s, a) => { s.status = 'failed'; s.error = a.error.message; }) });
const auth = createSlice({ name: 'auth', initialState: { user: JSON.parse(localStorage.getItem('cvconnect_user') || 'null') }, reducers: { signIn(state, action) { state.user = action.payload; localStorage.setItem('cvconnect_user', JSON.stringify(action.payload)); }, signOut(state) { state.user = null; localStorage.removeItem('cvconnect_user'); localStorage.removeItem('cvconnect_token'); } } });
export const { setResume, resolveChange } = workspace.actions; export const { signIn, signOut } = auth.actions;
export const store = configureStore({ reducer: { workspace: workspace.reducer, auth: auth.reducer } });

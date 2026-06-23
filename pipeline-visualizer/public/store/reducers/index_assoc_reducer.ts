import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IndexAssociation } from '../../../common';
import { routeService } from '../../route_service';

interface IndexAssocState {
  byPipeline: Record<string, IndexAssociation[]>;
  loading: boolean;
  error: string | null;
}
const initialState: IndexAssocState = { byPipeline: {}, loading: false, error: null };

export const fetchIndexAssociations = createAsyncThunk('indexAssoc/fetch', async (_, { rejectWithValue }) => {
  try { return await routeService.getIndexAssociations(); }
  catch (err: any) { return rejectWithValue(err.body?.message ?? err.message ?? 'Failed'); }
});

const slice = createSlice({
  name: 'indexAssoc', initialState, reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchIndexAssociations.pending, s => { s.loading = true; s.error = null; });
    b.addCase(fetchIndexAssociations.fulfilled, (s, a) => { s.loading = false; s.byPipeline = a.payload.byPipeline; });
    b.addCase(fetchIndexAssociations.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });
  },
});
export default slice.reducer;

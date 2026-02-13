import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { requestApi } from '../services/requestApi';

// Async thunks
export const fetchRequests = createAsyncThunk(
    'requests/fetchRequests',
    async (roomId, { rejectWithValue }) => {
        try {
            const response = await requestApi.getRequests(roomId);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.msg || 'Failed to fetch requests');
        }
    }
);

export const submitYoutubeRequest = createAsyncThunk(
    'requests/submitYoutube',
    async ({ roomId, data }, { rejectWithValue }) => {
        try {
            const response = await requestApi.youtubeRequest(roomId, data);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.msg || 'Failed to submit YouTube request');
        }
    }
);

export const submitUploadRequest = createAsyncThunk(
    'requests/submitUpload',
    async ({ roomId, formData }, { rejectWithValue }) => {
        try {
            const response = await requestApi.uploadRequest(roomId, formData);
            return response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.msg || 'Failed to submit upload request');
        }
    }
);

export const voteRequest = createAsyncThunk(
    'requests/vote',
    async ({ roomId, requestId }, { rejectWithValue }) => {
        try {
            const response = await requestApi.vote(roomId, requestId);
            return { requestId, data: response }; // Return requestId to identify which item to update
        } catch (error) {
            return rejectWithValue(error.response?.data?.msg || 'Failed to vote');
        }
    }
);

// 🔧 Helper: Sort requests by votes (desc), then by createdAt (asc) for same vote count
const sortByVotes = (items) => {
    return [...items].sort((a, b) => {
        const votesA = Array.isArray(a.votes) ? a.votes.length : (a.votes || 0);
        const votesB = Array.isArray(b.votes) ? b.votes.length : (b.votes || 0);
        if (votesB !== votesA) return votesB - votesA; // Votes cao trước
        return new Date(a.createdAt) - new Date(b.createdAt); // Cùng votes: cũ trước
    });
};

// Slice
const requestSlice = createSlice({
    name: 'requests',
    initialState: {
        items: [],
        loading: false,
        error: null,
        submitLoading: false, // Separate loading state for submission
        voteLoading: null, // Store requestId of currently voting item
    },
    reducers: {
        clearRequests: (state) => {
            state.items = [];
            state.error = null;
        },
        // Action to manually update requests list (e.g. from socket or host action)
        setRequests: (state, action) => {
            state.items = action.payload;
        },
        updateRequestVotes: (state, action) => {
            const { requestId, votes } = action.payload;
            // Tìm bài hát đang hiển thị
            const index = state.items.findIndex(r => r._id === requestId);
            if (index !== -1) {
                // Cập nhật ngay lập tức mảng votes mới
                state.items[index].votes = votes;
                // ✅ Phase 3: Re-sort sau khi vote thay đổi
                state.items = sortByVotes(state.items);
            }
        },
        // Action to update a single request (e.g. vote update from socket)
        updateRequest: (state, action) => {
            const index = state.items.findIndex(r => r._id === action.payload._id);
            if (index !== -1) {
                state.items[index] = action.payload;
            }
        },
        // Action to add a new request (e.g. from socket)
        addRequest: (state, action) => {
            state.items.unshift(action.payload);
        },
        // Action to remove a request (e.g. rejected/approved)
        removeRequest: (state, action) => {
            state.items = state.items.filter(r => r._id !== action.payload);
        }
    },
    extraReducers: (builder) => {
        // Fetch requests
        builder.addCase(fetchRequests.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchRequests.fulfilled, (state, action) => {
            state.loading = false;
            // ✅ Phase 3: Sort by votes sau khi fetch
            const rawItems = action.payload.requests || action.payload.songRequests || [];
            state.items = sortByVotes(rawItems);
        });
        builder.addCase(fetchRequests.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        });

        // Submit YouTube
        builder.addCase(submitYoutubeRequest.pending, (state) => {
            state.submitLoading = true;
            state.error = null;
        });
        builder.addCase(submitYoutubeRequest.fulfilled, (state, action) => {
            state.submitLoading = false;
            // Optimistically add or rely on fetch/socket? 
            // Usually socket will handle broadcast, but for own UI response:
            if (action.payload.request) {
                state.items.unshift(action.payload.request);
            }
        });
        builder.addCase(submitYoutubeRequest.rejected, (state, action) => {
            state.submitLoading = false;
            state.error = action.payload;
        });

        // Submit Upload
        builder.addCase(submitUploadRequest.pending, (state) => {
            state.submitLoading = true;
            state.error = null;
        });
        builder.addCase(submitUploadRequest.fulfilled, (state, action) => {
            state.submitLoading = false;
            if (action.payload.request) {
                state.items.unshift(action.payload.request);
            }
        });
        builder.addCase(submitUploadRequest.rejected, (state, action) => {
            state.submitLoading = false;
            state.error = action.payload;
        });

        // Vote
        builder.addCase(voteRequest.pending, (state, action) => {
            // We can't easily get requestId from meta.arg here without typescript/thunk knowing args
            // But techinically we can access action.meta.arg
            state.voteLoading = action.meta.arg.requestId;
        });
        builder.addCase(voteRequest.fulfilled, (state, action) => {
            state.voteLoading = null;
            // Update the specific item if returned data contains updated request
            if (action.payload.data && action.payload.data.request) {
                const index = state.items.findIndex(r => r._id === action.payload.data.request._id);
                if (index !== -1) {
                    state.items[index] = action.payload.data.request;
                }
            }
        });
        builder.addCase(voteRequest.rejected, (state) => {
            state.voteLoading = null;
        });
    }
});

export const { clearRequests, setRequests, updateRequest, addRequest, removeRequest, updateRequestVotes } = requestSlice.actions;
export default requestSlice.reducer;

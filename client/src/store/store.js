import { configureStore } from '@reduxjs/toolkit';
import requestReducer from './requestSlice';

export const store = configureStore({
    reducer: {
        requests: requestReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // Turn off serializable check for now if needed (e.g. for non-serializable data in actions, though generally bad practice)
        }),
});

// Importing necessary modules from 'multer' for handling file uploads and 'express' for handling requests
import multer, { StorageEngine } from 'multer';
import { Request } from 'express';
import { CallbackError } from 'mongoose';

// Setting up the storage engine for multer
const storage: StorageEngine = multer.diskStorage({
    // Defining the destination where the files should be stored
    destination: function (req: Request, file: Express.Multer.File, cb: (error: CallbackError | null, destination: string) => void) {
        // Callback to specify the destination folder for uploaded files
        cb(null, './public/temp');
    },
    // Defining the filename to be used for the stored files
    filename: function (req: Request, file: Express.Multer.File, cb: (error: CallbackError | null, filename: string) => void) {
        // Callback to specify the filename as the original name of the uploaded file
        cb(null, file.originalname);
    }
});

// Creating a multer instance with the defined storage engine
export const uploadFile = multer({
    storage
});
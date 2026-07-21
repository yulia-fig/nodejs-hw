// src/routes/studentsRoutes.js

import { Router } from 'express';
import { celebrate } from 'celebrate';
import {
  createNoteSchema,
  noteIdSchema,
  updateNoteSchema,
  getAllNotesSchema,
} from '../validations/notesValidation.js';
import {
	getAllNotes,
	getNoteById,
  createNote,
  deleteNote,
  updateNote,
} from '../controllers/notesController.js';

// 1. Імпортуємо middleware
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// 2. Додаємо middleware до всіх шляхів, що починаються з /students
router.use("/notes", authenticate);
router.get('/notes', celebrate(getAllNotesSchema), getAllNotes);
router.get('/notes/:noteId', celebrate(noteIdSchema), getNoteById);
router.post('/notes', celebrate(createNoteSchema), createNote);
router.delete('/notes/:noteId', celebrate(noteIdSchema), deleteNote);
router.patch('/notes/:noteId', celebrate(updateNoteSchema), updateNote);

export default router;

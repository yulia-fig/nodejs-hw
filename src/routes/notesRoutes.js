// src/routes/studentsRoutes.js

import { Router } from 'express';
import { celebrate } from 'celebrate';
import {
  createNoteSchema,
  noteIdParamSchema,
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

const router = Router();

router.get('/notes', celebrate(getAllNotesSchema), getAllNotes);
router.get('/notes/:noteId', celebrate(noteIdParamSchema), getNoteById);
router.post('/notes', celebrate(createNoteSchema), createNote);
router.delete('/notes/:noteId', celebrate(noteIdParamSchema), deleteNote);
router.patch('/notes/:noteId', celebrate(updateNoteSchema), updateNote);

export default router;

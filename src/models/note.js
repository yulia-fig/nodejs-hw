import { Schema, model } from "mongoose";

import { TAGS } from '../constants/tags.js';

const noteSchema = new Schema(
  {
    userId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: true,
},
    title: {
      type: String,
      required: true,
      trim: true, // прибирає пробіли на початку та в кінці
    },
    content: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    tag: {
      type: String,
      required: false,
      enum: TAGS,
      default: 'Todo',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Оновлюємо індекс полем userId
// Тому що будемо використовувати його при пошуку
noteSchema.index({ userId: 1, tag: 1 });

export const Note = model('Note', noteSchema);

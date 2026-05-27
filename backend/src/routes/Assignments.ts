import express from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment
} from '../controllers/AssignmentController';

const router = express.Router();

router.post('/', createAssignment);
router.get('/', getAssignments);
router.get('/:id', getAssignmentById);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

import { upload } from '../controllers/AssignmentController';

router.post('/', upload.single('file'), createAssignment);

export default router;
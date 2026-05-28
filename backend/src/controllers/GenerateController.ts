import { Request, Response } from 'express';
import generationQueue from '../queues/GenerationQueue';
import Assignment from '../models/Assignment';

export const startGeneration = async (req: Request, res: Response) => {
  try {
    // pdfBase64 is optional — sent by frontend when user uploads a PDF/image
    const { assignmentId, formData, pdfBase64, pdfMimeType } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const job = await generationQueue.add('generate-paper', {
      assignmentId,
      formData,
      // Pass the raw base64 string + mime type into the job so the worker can use it
      pdfBase64: pdfBase64 || null,
      pdfMimeType: pdfMimeType || null,
    });

    res.status(202).json({
      success: true,
      message: 'Generation started',
      jobId: job.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await generationQueue.getJob(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    const state = await job.getState();
    res.status(200).json({ success: true, status: state, result: job.returnvalue });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

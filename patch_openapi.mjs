import fs from 'fs';
import yaml from 'yaml';

const openapiPath = 'openapi/openapi.yaml';
const file = fs.readFileSync(openapiPath, 'utf8');
const doc = yaml.parseDocument(file);

// Add TranscriptSource
doc.getIn(['components', 'schemas', 'TranscriptSource']) || doc.setIn(['components', 'schemas', 'TranscriptSource'], {
  type: 'string',
  enum: ['WHISPER', 'MODAL', 'UPLOAD', 'MANUAL'],
});

// Add TranscriptEntity
doc.getIn(['components', 'schemas', 'TranscriptEntity']) || doc.setIn(['components', 'schemas', 'TranscriptEntity'], {
  type: 'object',
  required: ['id', 'recordingId', 'source', 'status', 'isActive', 'createdAt'],
  properties: {
    id: { type: 'string' },
    recordingId: { type: 'string' },
    source: { $ref: '#/components/schemas/TranscriptSource' },
    status: { $ref: '#/components/schemas/SubtitleStatus' },
    language: { type: 'string', nullable: true },
    vttText: { type: 'string', nullable: true },
    srtText: { type: 'string', nullable: true },
    errorMessage: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    generatedAt: { type: 'string', format: 'date-time', nullable: true },
  }
});

// Add GET /transcripts
const transcriptsPath = '/api/v1/recordings/{recordingId}/transcripts';
doc.setIn(['paths', transcriptsPath], {
  get: {
    tags: ['Recordings'],
    operationId: 'getRecordingTranscripts',
    summary: 'Get all transcripts for a recording',
    parameters: [
      { in: 'path', name: 'recordingId', required: true, schema: { type: 'string' } }
    ],
    responses: {
      '200': {
        description: 'List of transcripts',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/TranscriptEntity' }
            }
          }
        }
      },
      '404': { $ref: '#/components/schemas/ErrorResponse' }
    }
  }
});

// Add PATCH /transcripts/:id
const patchPath = '/api/v1/recordings/{recordingId}/transcripts/{transcriptId}';
doc.setIn(['paths', patchPath], {
  patch: {
    tags: ['Recordings'],
    operationId: 'updateTranscript',
    summary: 'Update transcript (e.g. set active, update lyrics)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'recordingId', required: true, schema: { type: 'string' } },
      { in: 'path', name: 'transcriptId', required: true, schema: { type: 'string' } }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              isActive: { type: 'boolean' },
              srtText: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'Updated transcript',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TranscriptEntity' }
          }
        }
      },
      '401': { $ref: '#/components/schemas/ErrorResponse' },
      '404': { $ref: '#/components/schemas/ErrorResponse' }
    }
  }
});

// Add POST /transcripts/upload
const uploadPath = '/api/v1/recordings/{recordingId}/transcripts/upload';
doc.setIn(['paths', uploadPath], {
  post: {
    tags: ['Recordings'],
    operationId: 'uploadTranscript',
    summary: 'Upload a transcript file (SRT or VTT)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'recordingId', required: true, schema: { type: 'string' } }
    ],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: { type: 'string', format: 'binary' }
            }
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'Uploaded transcript',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TranscriptEntity' }
          }
        }
      }
    }
  }
});

// Add POST /transcripts/generate
const generatePath = '/api/v1/recordings/{recordingId}/transcripts/generate';
doc.setIn(['paths', generatePath], {
  post: {
    tags: ['Recordings'],
    operationId: 'generateTranscript',
    summary: 'Generate transcript using an AI provider (e.g. whisper)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'recordingId', required: true, schema: { type: 'string' } }
    ],
    requestBody: {
      required: false,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              provider: { type: 'string', enum: ['whisper', 'modal'] }
            }
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'Started generation',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TranscriptEntity' }
          }
        }
      }
    }
  }
});

fs.writeFileSync(openapiPath, String(doc));
console.log('Patched openapi.yaml');

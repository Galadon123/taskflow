const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
    listProjects, createProject, getProject, updateProject, deleteProject,
} = require('../controllers/projectController');
const {
    listTasks, createTask, getTask, updateTask, updateStatus, assignTask, deleteTask,
} = require('../controllers/taskController');

router.use(authenticate);

// Projects
router.get('/projects', listProjects);
router.post('/projects', createProject);
router.get('/projects/:id', getProject);
router.put('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);

// Tasks
router.get('/projects/:id/tasks', listTasks);
router.post('/projects/:id/tasks', createTask);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);
router.patch('/:taskId/status', updateStatus);
router.post('/:taskId/assign', assignTask);

module.exports = router;

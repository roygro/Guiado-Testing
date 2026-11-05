import 'package:flutter/material.dart';
import 'task_list_panel.dart';

void main() {
  runApp(const TaskManagerApp());
}

class TaskManagerApp extends StatefulWidget {
  const TaskManagerApp({super.key});

  @override
  State<TaskManagerApp> createState() => _TaskManagerAppState();
}

class _TaskManagerAppState extends State<TaskManagerApp> {
  bool _isLoggedIn = false;
  String _userEmail = '';
  final List<String> _tasks = [];
  final Set<String> _completedTasks = {};

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _taskTitleController = TextEditingController();

  void _login() {
    if (_emailController.text.isNotEmpty && _passwordController.text.isNotEmpty) {
      setState(() {
        _isLoggedIn = true;
        _userEmail = _emailController.text;
      });
    }
  }

  void _logout() {
    setState(() {
      _isLoggedIn = false;
      _userEmail = '';
      _emailController.clear();
      _passwordController.clear();
    });
  }

  void _addTask() {
    final title = _taskTitleController.text.trim();
    if (title.isNotEmpty) {
      setState(() {
        _tasks.add(title);
        _taskTitleController.clear();
      });
      Navigator.of(context).pop();
    }
  }

  void _openAddTaskDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Task'),
        content: TextField(
          key: const Key('task-title-field'),
          controller: _taskTitleController,
          decoration: const InputDecoration(labelText: 'Task title'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            key: const Key('save-task-button'),
            onPressed: _addTask,
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Task Manager',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterialDesign: true,
      ),
      home: _isLoggedIn ? _buildDashboard() : _buildLoginScreen(),
    );
  }

  Widget _buildLoginScreen() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Login', key: Key('login-screen-title')),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              key: const Key('email-field'),
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('password-field'),
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              key: const Key('login-button'),
              onPressed: _login,
              child: const Text('Sign In'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboard() {
    return Scaffold(
      appBar: AppBar(
        title: Text('Tasks ($_userEmail)'),
        actions: [
          IconButton(
            key: const Key('logout-button'),
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      body: _tasks.isEmpty
          ? const Center(child: Text('No tasks yet.'))
          : ListView.builder(
              itemCount: _tasks.length,
              itemBuilder: (ctx, index) {
                final task = _tasks[index];
                final isDone = _completedTasks.contains(task);
                return ListTile(
                  title: Text(
                    task,
                    style: TextStyle(
                      decoration: isDone ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  trailing: IconButton(
                    key: Key('complete-task-$task'),
                    icon: Icon(
                      isDone ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: isDone ? Colors.green : Colors.grey,
                    ),
                    onPressed: () {
                      setState(() {
                        if (isDone) {
                          _completedTasks.remove(task);
                        } else {
                          _completedTasks.add(task);
                        }
                      });
                    },
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        key: const Key('add-task-button'),
        onPressed: _openAddTaskDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}

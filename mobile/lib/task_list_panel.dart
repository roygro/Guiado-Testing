import 'package:flutter/material.dart';

/// Shows tasks or the current loading, empty, or error state.
class TaskListPanel extends StatelessWidget {
  /// Creates a task list panel.
  const TaskListPanel({
    super.key,
    required this.loading,
    required this.tasks,
    this.errorMessage,
    this.onRetry,
    this.onTaskToggle,
  });

  /// Whether tasks are being loaded.
  final bool loading;

  /// Task titles or descriptions to display.
  final List<String> tasks;

  /// Optional safe error message.
  final String? errorMessage;

  /// Optional retry callback when in error state.
  final VoidCallback? onRetry;

  /// Optional callback when tapping a task.
  final void Function(int index)? onTaskToggle;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 12),
              if (onRetry != null)
                ElevatedButton(
                  key: const Key('retry-button'),
                  onPressed: onRetry,
                  child: const Text('Retry'),
                ),
            ],
          ),
        ),
      );
    }

    if (tasks.isEmpty) {
      return const Center(child: Text('No tasks yet.'));
    }

    return ListView.builder(
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        final task = tasks[index];
        return ListTile(
          key: Key('task-item-$index'),
          title: Text(task),
          onTap: onTaskToggle != null ? () => onTaskToggle!(index) : null,
        );
      },
    );
  }
}

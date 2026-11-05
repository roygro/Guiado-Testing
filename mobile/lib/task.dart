/// Converts a JSON object into a task value.
class Task {
  /// Creates a task.
  const Task({required this.id, required this.title, this.isCompleted = false});

  /// Unique server identifier.
  final String id;

  /// User-visible task title.
  final String title;

  /// Whether the task is marked completed.
  final bool isCompleted;

  /// Parses a task from JSON.
  ///
  /// Throws [FormatException] when required fields are missing or invalid.
  factory Task.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final title = json['title'];
    final completed = json['completed'] ?? json['isCompleted'] ?? false;

    if (id is! String || id.trim().isEmpty) {
      throw const FormatException('Invalid or missing task ID.');
    }

    if (title is! String || title.trim().isEmpty) {
      throw const FormatException('Invalid task data.');
    }

    return Task(
      id: id.trim(),
      title: title.trim(),
      isCompleted: completed == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'completed': isCompleted,
  };
}

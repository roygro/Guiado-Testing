import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/task.dart';

void main() {
  group('Task.fromJson Unit Tests', () {
    test('parses a valid task', () {
      final task = Task.fromJson({'id': 'task-1', 'title': 'Plan tests'});
      expect(task.id, 'task-1');
      expect(task.title, 'Plan tests');
      expect(task.isCompleted, isFalse);
    });

    test('rejects an empty title', () {
      expect(
        () => Task.fromJson({'id': 'task-1', 'title': '  '}),
        throwsFormatException,
      );
    });

    // Practice exercise: Add a unit test for a missing ID
    test('rejects when ID is missing from JSON', () {
      expect(
        () => Task.fromJson({'title': 'Plan tests'}),
        throwsA(isA<FormatException>()),
      );
    });

    // Practice exercise: Add a unit test for a null or invalid ID
    test('rejects when ID is null or empty', () {
      expect(
        () => Task.fromJson({'id': null, 'title': 'Plan tests'}),
        throwsFormatException,
      );
      expect(
        () => Task.fromJson({'id': '   ', 'title': 'Plan tests'}),
        throwsFormatException,
      );
    });
  });
}

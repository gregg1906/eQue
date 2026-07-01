import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class QueueSocketService {
  WebSocketChannel? _channel;

  Stream<Map<String, dynamic>> connectToQueue(String ticketCode) {
    // Podmień adres na docelowe IP/domenę Waszego serwera
    final wsUrl = Uri.parse('ws://10.0.2.2:8000/api/v1/queue/ws/$ticketCode');
    _channel = WebSocketChannel.connect(wsUrl);

    return _channel!.stream.map((event) => jsonDecode(event as String));
  }

  void disconnect() {
    _channel?.sink.close();
  }
}
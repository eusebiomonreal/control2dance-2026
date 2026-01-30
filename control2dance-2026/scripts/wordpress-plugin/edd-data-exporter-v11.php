<?php
/**
 * Plugin Name: EDD Data Exporter (v11 - UNIFIED)
 * Description: El exporter definitivo: une edd_orders, edd_order_transactions y metadatos
 * Version: 11.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V11 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v11', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v11', 'EDD Export v11', 'manage_options', 'edd-data-exporter-v11', [$this, 'admin_page'], 'dashicons-admin-tools', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🚀 Exportador Unificado de Pedidos y Transacciones (v11)</h1>
            <p>Este es el exportador final. Combina la información de la tabla principal de pedidos, la tabla de transacciones y todos los metadatos conocidos.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v11">
                <?php wp_nonce_field('export_edd_data_v11', 'export_nonce'); ?>
                <?php submit_button('🚀 Generar Exportación Unificada'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v11', 'export_nonce');
        
        $export_data = [
            'exported_at' => current_time('mysql'),
            'orders' => $this->export_unified_orders(),
        ];
        
        $json = json_encode($export_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-export-v11-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function export_unified_orders() {
        global $wpdb;
        $data = [];
        
        $table_orders = "{$wpdb->prefix}edd_orders";
        $table_txs = "{$wpdb->prefix}edd_order_transactions";
        
        // Obtenemos todos los pedidos
        $orders = $wpdb->get_results("SELECT o.*, c.email as c_email FROM $table_orders o LEFT JOIN {$wpdb->prefix}edd_customers c ON o.customer_id = c.id ORDER BY o.id DESC");
        
        foreach ($orders as $order) {
            $transaction_id = '';

            // 1. Prioridad: Tabla edd_order_transactions (específica para esto)
            $tx_from_table = $wpdb->get_var($wpdb->prepare("SELECT transaction_id FROM $table_txs WHERE order_id = %d LIMIT 1", $order->id));
            if (!empty($tx_from_table)) {
                $transaction_id = $tx_from_table;
            }
            
            // 2. Si vacío, campo transaction_id de la propia tabla orders
            if (empty($transaction_id) && !empty($order->transaction_id)) {
                $transaction_id = $order->transaction_id;
            }

            // 3. Si sigue vacío, buscar en metadatos (paypal_order_id, etc)
            if (empty($transaction_id)) {
                $keys = ['paypal_order_id', '_edd_payment_transaction_id', '_edd_stripe_payment_intent', '_edd_stripe_checkout_session'];
                foreach ($keys as $key) {
                    $val = $wpdb->get_var($wpdb->prepare(
                        "SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = %s",
                        $order->id, $key
                    ));
                    if (!empty($val)) {
                        $transaction_id = $val;
                        break;
                    }
                }
            }
            
            $data[] = [
                'order_number' => $order->order_number,
                'customer_email' => $order->c_email,
                'payment_method' => $order->gateway,
                'transaction_id' => $transaction_id,
                'status' => $order->status,
                'total' => $order->total,
                'created_at' => $order->date_created
            ];
        }
        return $data;
    }
}
new EDD_Data_Exporter_V11();
